import os
from typing import List, Optional

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_active_user, require_admin
from app.models.dataset import DataCategory, Dataset, DatasetStatus
from app.models.user import User, UserRole
from app.schemas.dataset import DatasetResponse, DatasetReview, DatasetUpdate

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("/", response_model=List[DatasetResponse])
def list_datasets(
    category: Optional[DataCategory] = None,
    status: Optional[DatasetStatus] = None,
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Dataset)
    if current_user.role != UserRole.admin:
        q = q.filter(
            (Dataset.is_public == True) | (Dataset.owner_id == current_user.id)  # noqa: E712
        )
    if category:
        q = q.filter(Dataset.category == category)
    if status:
        q = q.filter(Dataset.status == status)
    if tag:
        q = q.filter(Dataset.tags.contains([tag]))
    return q.all()


@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: DataCategory = Form(DataCategory.other),
    tags: str = Form("[]"),
    is_public: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    import json

    try:
        tags_list = json.loads(tags)
    except Exception:
        tags_list = []

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    dataset = Dataset(
        title=title,
        description=description,
        file_path=file_path,
        file_size=len(content),
        owner_id=current_user.id,
        category=category,
        tags=tags_list,
        is_public=is_public,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.is_public and dataset.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return dataset


@router.put("/{dataset_id}", response_model=DatasetResponse)
def update_dataset(
    dataset_id: int,
    payload: DatasetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dataset, field, value)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    if dataset.file_path and os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    db.delete(dataset)
    db.commit()


@router.put("/{dataset_id}/review", response_model=DatasetResponse)
def review_dataset(
    dataset_id: int,
    payload: DatasetReview,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.status = payload.status
    dataset.review_reason = payload.reason
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}/download")
def download_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.is_public and dataset.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if not dataset.file_path or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(dataset.file_path, filename=os.path.basename(dataset.file_path))
