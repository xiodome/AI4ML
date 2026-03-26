import enum

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class TaskStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    nl_requirement = Column(Text, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending)
    current_stage = Column(String(128), default="")
    agent_logs = Column(JSON, default=list)
    generated_code = Column(Text)
    result_report = Column(JSON, default=dict)
    human_interventions = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="tasks")
    dataset = relationship("Dataset", back_populates="tasks")
    ml_model = relationship("MLModel", back_populates="source_task", uselist=False)
