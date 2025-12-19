from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
import backend.services.dataset_service as service
from backend.utils.logging import LoggingAPIRoute
from backend.db.session import get_db

router = APIRouter(
    prefix="/api/datasets",
    tags=["datasets"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.Dataset])
def read_datasets(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.Dataset)
def create_dataset(dataset: schemas.DatasetBase, db: Session = Depends(get_db)):
    existing = service.get_by_id(db, dataset.id)
    if existing:
        return service.update(db, dataset.id, dataset)
    return service.create(db, dataset)

@router.put("/{dataset_id}", response_model=schemas.Dataset)
def update_dataset(dataset_id: int, dataset: schemas.DatasetBase, db: Session = Depends(get_db)):
    db_dataset = service.update(db, dataset_id, dataset)
    if not db_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return db_dataset

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    try:
        success = service.delete(db, dataset_id)
        if not success:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{dataset_id}/execute")
def execute_dataset_sql(dataset_id: int, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return service.execute_query(db, dataset_id, limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
