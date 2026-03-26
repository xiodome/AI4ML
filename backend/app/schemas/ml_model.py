from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.dataset import DataCategory, DatasetStatus


class MLModelUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    demo_endpoint: Optional[str] = None


class MLModelReview(BaseModel):
    status: DatasetStatus
    reason: Optional[str] = None


class PredictRequest(BaseModel):
    features: Dict[str, Any]


class MLModelResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    task_id: Optional[int] = None
    owner_id: int
    status: DatasetStatus
    category: DataCategory
    tags: List[str] = []
    is_public: bool
    performance_metrics: Dict[str, Any] = {}
    feature_importance: Dict[str, Any] = {}
    demo_endpoint: Optional[str] = None
    review_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
