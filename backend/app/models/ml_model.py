from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.dataset import DataCategory, DatasetStatus


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.pending)
    category = Column(Enum(DataCategory), default=DataCategory.other)
    tags = Column(JSON, default=list)
    is_public = Column(Boolean, default=False)
    performance_metrics = Column(JSON, default=dict)
    feature_importance = Column(JSON, default=dict)
    demo_endpoint = Column(String(512))
    review_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="ml_models")
    source_task = relationship("Task", back_populates="ml_model", foreign_keys=[task_id])
