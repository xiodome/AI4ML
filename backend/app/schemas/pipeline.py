from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PipelineCreate(BaseModel):
    title: str
    description: Optional[str] = None
    workflow_config: Dict[str, Any] = {}
    prompt_templates: Dict[str, Any] = {}
    is_public: bool = False
    tags: List[str] = []


class PipelineUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    workflow_config: Optional[Dict[str, Any]] = None
    prompt_templates: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None


class PipelineResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    owner_id: int
    original_pipeline_id: Optional[int] = None
    workflow_config: Dict[str, Any] = {}
    prompt_templates: Dict[str, Any] = {}
    fork_count: int
    is_public: bool
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
