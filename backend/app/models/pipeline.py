from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=True)
    workflow_config = Column(JSON, default=dict)
    prompt_templates = Column(JSON, default=dict)
    fork_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=False)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="pipelines")
    original = relationship(
        "Pipeline",
        remote_side=[id],
        foreign_keys=[original_pipeline_id],
        overlaps="forks",
    )
    forks = relationship(
        "Pipeline",
        foreign_keys=[original_pipeline_id],
        overlaps="original",
    )
