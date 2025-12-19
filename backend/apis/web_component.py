from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.web_component_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/web-components",
    tags=["web-components"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.WebComponentTemplate])
def read_web_components(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.WebComponentTemplate)
def create_web_component(comp: schemas.WebComponentTemplateBase, db: Session = Depends(get_db)):
    return service.create_or_update(db, comp)

@router.delete("/{comp_id}")
def delete_web_component(comp_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, comp_id)
    if not success:
        raise HTTPException(status_code=404, detail="Component not found")
    return {"ok": True}
