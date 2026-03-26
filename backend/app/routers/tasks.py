import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.agents import DataAgent, ManagerAgent, ModelAgent, OperationAgent
from app.config import settings
from app.database import SessionLocal, get_db
from app.dependencies import decode_token, get_current_active_user
from app.models.dataset import Dataset
from app.models.ml_model import MLModel
from app.models.task import Task, TaskStatus
from app.models.user import User, UserRole
from app.schemas.task import InterventionRequest, TaskCodeUpdate, TaskCreate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# In-memory registry of active WebSocket connections keyed by task_id
# ---------------------------------------------------------------------------
_ws_connections: Dict[int, List[WebSocket]] = {}


async def _broadcast(task_id: int, message: Dict[str, Any]) -> None:
    sockets = _ws_connections.get(task_id, [])
    dead = []
    for ws in sockets:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------

async def _run_pipeline(task_id: int) -> None:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return

        task.status = TaskStatus.running
        task.current_stage = "manager"
        db.commit()

        context: Dict[str, Any] = {
            "nl_requirement": task.nl_requirement,
            "file_path": "",
        }

        # Resolve dataset file path
        if task.dataset_id:
            dataset = db.query(Dataset).filter(Dataset.id == task.dataset_id).first()
            if dataset and dataset.file_path:
                context["file_path"] = dataset.file_path

        # Check for human interventions that override context
        for intervention in (task.human_interventions or []):
            if intervention.get("stage") == "context":
                for k, v in intervention.get("parameters", {}).items():
                    context[k] = v

        logs: List[Dict[str, Any]] = list(task.agent_logs or [])

        async def log_callback(entry: Dict[str, Any]) -> None:
            logs.append(entry)
            # Persist frequently
            task.agent_logs = list(logs)
            task.current_stage = entry.get("stage", task.current_stage)
            db.commit()
            await _broadcast(task_id, {"type": "log", "data": entry})

        agents = [
            (ManagerAgent(), "manager"),
            (DataAgent(), "data_analysis"),
            (ModelAgent(), "model_training"),
            (OperationAgent(), "code_generation"),
        ]

        for agent, stage in agents:
            agent.set_log_callback(log_callback)
            # Honour cancellation
            task = db.query(Task).filter(Task.id == task_id).first()
            if task.status == TaskStatus.cancelled:
                return
            task.current_stage = stage
            db.commit()
            try:
                context = await agent.run(context)
            except Exception as exc:
                await log_callback(
                    {
                        "agent": type(agent).__name__,
                        "message": f"Agent error: {exc}",
                        "log_type": "error",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "stage": stage,
                    }
                )
                task.status = TaskStatus.failed
                db.commit()
                await _broadcast(task_id, {"type": "complete", "data": {"status": "failed"}})
                return

        # Finalise task
        task = db.query(Task).filter(Task.id == task_id).first()
        task.generated_code = context.get("generated_code", "")
        task.result_report = {
            "model_type": context.get("selected_model", ""),
            "metrics": context.get("metrics", {}),
            "feature_importance": context.get("feature_importance", {}),
            "task_type": context.get("task_type", ""),
            "dataset_info": context.get("dataset_info", {}),
        }
        task.status = TaskStatus.completed
        task.current_stage = "completed"
        task.agent_logs = list(logs)
        db.commit()

        # Persist MLModel record
        ml_model = MLModel(
            title=f"Model from Task #{task_id}",
            description=task.nl_requirement,
            task_id=task_id,
            owner_id=task.owner_id,
            performance_metrics=context.get("metrics", {}),
            feature_importance=context.get("feature_importance", {}),
            tags=[context.get("task_type", "")],
        )
        db.add(ml_model)
        db.commit()

        await _broadcast(task_id, {"type": "complete", "data": {"status": "completed"}})
    except Exception as exc:
        db.rollback()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = TaskStatus.failed
            db.commit()
        await _broadcast(task_id, {"type": "complete", "data": {"status": "failed", "error": str(exc)}})
    finally:
        db.close()


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    remaining = current_user.api_token_quota - current_user.api_token_used
    if remaining < settings.TOKENS_PER_TASK:
        raise HTTPException(status_code=402, detail="Insufficient API token quota")

    # Deduct tokens
    current_user.api_token_used += settings.TOKENS_PER_TASK
    db.commit()

    task = Task(
        title=payload.title,
        description=payload.description,
        nl_requirement=payload.nl_requirement,
        owner_id=current_user.id,
        dataset_id=payload.dataset_id,
        status=TaskStatus.pending,
        agent_logs=[],
        human_interventions=[],
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Fire-and-forget background pipeline; log unhandled exceptions
    bg_task = asyncio.create_task(_run_pipeline(task.id))
    bg_task.add_done_callback(
        lambda t: t.exception() if not t.cancelled() else None
    )

    return task


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Task)
    if current_user.role != UserRole.admin:
        q = q.filter(Task.owner_id == current_user.id)
    return q.order_by(Task.created_at.desc()).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    if task.status == TaskStatus.running:
        task.status = TaskStatus.cancelled
    elif task.status in (TaskStatus.pending,):
        task.status = TaskStatus.cancelled
    else:
        db.delete(task)
    db.commit()


@router.get("/{task_id}/logs")
def get_logs(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    return {"logs": task.agent_logs or []}


@router.get("/{task_id}/code")
def get_code(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    return {"generated_code": task.generated_code}


@router.put("/{task_id}/code")
def update_code(
    task_id: int,
    payload: TaskCodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in (UserRole.admin, UserRole.developer):
        raise HTTPException(status_code=403, detail="Developer access required")
    task = _get_task_or_404(db, task_id, current_user)
    task.generated_code = payload.generated_code
    db.commit()
    db.refresh(task)
    return {"message": "Code updated", "task_id": task_id}


@router.get("/{task_id}/report")
def get_report(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    return {"report": task.result_report}


@router.post("/{task_id}/intervene")
def intervene(
    task_id: int,
    payload: InterventionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    task = _get_task_or_404(db, task_id, current_user)
    interventions = list(task.human_interventions or [])
    interventions.append(
        {
            "stage": payload.stage,
            "action": payload.action,
            "parameters": payload.parameters,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user.id,
        }
    )
    task.human_interventions = interventions
    db.commit()
    return {"message": "Intervention recorded", "task_id": task_id}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@router.websocket("/ws/tasks/{task_id}/progress")
async def task_progress_ws(task_id: int, websocket: WebSocket, token: Optional[str] = None):
    # Authenticate via query param ?token=...
    if token is None:
        token = websocket.query_params.get("token", "")

    username = decode_token(token) if token else None
    if not username:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            await websocket.close(code=4001)
            return
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            await websocket.close(code=4004)
            return
        if task.owner_id != user.id and user.role != UserRole.admin:
            await websocket.close(code=4003)
            return
    finally:
        db.close()

    await websocket.accept()

    _ws_connections.setdefault(task_id, []).append(websocket)
    try:
        # Send existing logs immediately so the client catches up
        db2 = SessionLocal()
        try:
            task2 = db2.query(Task).filter(Task.id == task_id).first()
            for entry in (task2.agent_logs or []):
                await websocket.send_json({"type": "log", "data": entry})
            if task2.status in (TaskStatus.completed, TaskStatus.failed, TaskStatus.cancelled):
                await websocket.send_json(
                    {"type": "complete", "data": {"status": task2.status.value}}
                )
        finally:
            db2.close()

        # Keep connection open
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        conns = _ws_connections.get(task_id, [])
        if websocket in conns:
            conns.remove(websocket)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_task_or_404(db: Session, task_id: int, user: User) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return task
