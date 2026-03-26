import enum

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DatasetStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class DataCategory(str, enum.Enum):
    tabular_regression = "tabular_regression"
    tabular_classification = "tabular_classification"
    image_classification = "image_classification"
    time_series = "time_series"
    nlp = "nlp"
    other = "other"


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    file_path = Column(String(512))
    file_size = Column(Integer, default=0)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.pending)
    category = Column(Enum(DataCategory), default=DataCategory.other)
    tags = Column(JSON, default=list)
    is_public = Column(Boolean, default=False)
    review_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="datasets")
    tasks = relationship("Task", back_populates="dataset")
