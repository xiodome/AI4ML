from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user
from app.models.pipeline import Pipeline
from app.models.user import User, UserRole
from app.schemas.pipeline import PipelineCreate, PipelineResponse, PipelineUpdate

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])


@router.get("/", response_model=List[PipelineResponse])
def list_pipelines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Pipeline)
    if current_user.role != UserRole.admin:
        q = q.filter(
            (Pipeline.is_public.is_(True)) | (Pipeline.owner_id == current_user.id)  # noqa: E712
        )
    return q.all()


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(
    payload: PipelineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pipeline = Pipeline(
        title=payload.title,
        description=payload.description,
        owner_id=current_user.id,
        workflow_config=payload.workflow_config,
        prompt_templates=payload.prompt_templates,
        is_public=payload.is_public,
        tags=payload.tags,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if not pipeline.is_public and pipeline.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline(
    pipeline_id: int,
    payload: PipelineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pipeline, field, value)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(pipeline)
    db.commit()


@router.post("/{pipeline_id}/fork", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def fork_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    original = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if not original.is_public and original.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    forked = Pipeline(
        title=f"{original.title} (fork)",
        description=original.description,
        owner_id=current_user.id,
        original_pipeline_id=original.id,
        workflow_config=dict(original.workflow_config or {}),
        prompt_templates=dict(original.prompt_templates or {}),
        is_public=False,
        tags=list(original.tags or []),
    )
    db.add(forked)
    original.fork_count = (original.fork_count or 0) + 1
    db.commit()
    db.refresh(forked)
    return forked
