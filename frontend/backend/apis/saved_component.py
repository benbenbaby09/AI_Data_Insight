from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.saved_component_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/saved-components",
    tags=["saved-components"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.SavedComponent])
def read_saved_components(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.SavedComponent)
def create_saved_component(comp: schemas.SavedComponentCreate, db: Session = Depends(get_db)):
    return service.create(db, comp)

@router.delete("/{comp_id}")
def delete_saved_component(comp_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, comp_id)
    if not success:
        raise HTTPException(status_code=404, detail="Component not found")
    return {"ok": True}
