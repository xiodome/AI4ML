from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.task import TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    nl_requirement: str
    dataset_id: Optional[int] = None


class TaskCodeUpdate(BaseModel):
    generated_code: str


class InterventionRequest(BaseModel):
    stage: str
    action: str
    parameters: Dict[str, Any] = {}


class AgentLogEntry(BaseModel):
    agent: str
    message: str
    log_type: str  # info / warning / success / error
    timestamp: str
    stage: str


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    nl_requirement: str
    owner_id: int
    dataset_id: Optional[int] = None
    status: TaskStatus
    current_stage: Optional[str] = None
    agent_logs: List[Dict[str, Any]] = []
    generated_code: Optional[str] = None
    result_report: Optional[Dict[str, Any]] = None
    human_interventions: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
