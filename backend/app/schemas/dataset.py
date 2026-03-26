from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.dataset import DataCategory, DatasetStatus


class DatasetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: DataCategory = DataCategory.other
    tags: List[str] = []
    is_public: bool = False


class DatasetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[DataCategory] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class DatasetReview(BaseModel):
    status: DatasetStatus
    reason: Optional[str] = None


class DatasetResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_size: int
    owner_id: int
    status: DatasetStatus
    category: DataCategory
    tags: List[str] = []
    is_public: bool
    review_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
