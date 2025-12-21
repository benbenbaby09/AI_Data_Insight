from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.widget_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/widgets",
    tags=["widgets"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.Widget])
def read_widgets(
    type: Optional[str] = Query(None, description="Filter by widget type (chart/web)"),
    db: Session = Depends(get_db)
):
    return service.get_all(db, type=type)

@router.get("/{widget_id}", response_model=schemas.Widget)
def read_widget(widget_id: int, db: Session = Depends(get_db)):
    widget = service.get_by_id(db, widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widget

@router.post("", response_model=schemas.Widget)
def create_widget(widget: schemas.WidgetCreate, db: Session = Depends(get_db)):
    return service.create(db, widget)

@router.put("/{widget_id}", response_model=schemas.Widget)
def update_widget(widget_id: int, widget: schemas.WidgetUpdate, db: Session = Depends(get_db)):
    updated = service.update(db, widget_id, widget)
    if not updated:
        raise HTTPException(status_code=404, detail="Widget not found")
    return updated

@router.delete("/{widget_id}")
def delete_widget(widget_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, widget_id)
    if not success:
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"ok": True}
