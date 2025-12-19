from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.chart_template_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/chart-templates",
    tags=["chart-templates"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.ChartTemplate])
def read_chart_templates(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.ChartTemplate)
def create_chart_template(temp: schemas.ChartTemplateBase, db: Session = Depends(get_db)):
    return service.create(db, temp)

@router.put("/{temp_id}", response_model=schemas.ChartTemplate)
def update_chart_template(temp_id: int, temp: schemas.ChartTemplateBase, db: Session = Depends(get_db)):
    updated = service.update(db, temp_id, temp)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated

@router.delete("/{temp_id}")
def delete_chart_template(temp_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, temp_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}
