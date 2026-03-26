from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.dataset import Dataset, DatasetStatus
from app.models.ml_model import MLModel
from app.models.task import Task
from app.models.user import User
from app.schemas.dataset import DatasetResponse
from app.schemas.ml_model import MLModelResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return {
        "users": db.query(User).count(),
        "tasks": db.query(Task).count(),
        "datasets": db.query(Dataset).count(),
        "models": db.query(MLModel).count(),
        "pending_datasets": db.query(Dataset).filter(Dataset.status == DatasetStatus.pending).count(),
        "pending_models": db.query(MLModel).filter(MLModel.status == DatasetStatus.pending).count(),
    }


@router.get("/pending-datasets", response_model=List[DatasetResponse])
def pending_datasets(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(Dataset).filter(Dataset.status == DatasetStatus.pending).all()


@router.get("/pending-models", response_model=List[MLModelResponse])
def pending_models(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(MLModel).filter(MLModel.status == DatasetStatus.pending).all()
