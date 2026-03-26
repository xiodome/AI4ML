from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user, require_admin
from app.models.dataset import DatasetStatus
from app.models.ml_model import MLModel
from app.models.user import User, UserRole
from app.schemas.ml_model import MLModelResponse, MLModelReview, MLModelUpdate, PredictRequest

router = APIRouter(prefix="/api/models", tags=["ml_models"])


@router.get("/", response_model=List[MLModelResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(MLModel)
    if current_user.role != UserRole.admin:
        q = q.filter(
            (MLModel.is_public.is_(True)) | (MLModel.owner_id == current_user.id)  # noqa: E712
        )
    return q.all()


@router.get("/{model_id}", response_model=MLModelResponse)
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.is_public and model.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return model


@router.put("/{model_id}", response_model=MLModelResponse)
def update_model(
    model_id: int,
    payload: MLModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if model.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model


@router.put("/{model_id}/review", response_model=MLModelResponse)
def review_model(
    model_id: int,
    payload: MLModelReview,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model.status = payload.status
    model.review_reason = payload.reason
    db.commit()
    db.refresh(model)
    return model


@router.post("/{model_id}/predict")
def predict(
    model_id: int,
    payload: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.is_public and model.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Simulated prediction response using feature importance as proxy
    features = payload.features
    fi = model.feature_importance or {}
    score = sum(fi.get(k, 0) * (v if isinstance(v, (int, float)) else 0) for k, v in features.items())

    return {
        "model_id": model_id,
        "features": features,
        "prediction": round(score, 4),
        "note": "Demo prediction endpoint – replace with real model inference.",
    }
