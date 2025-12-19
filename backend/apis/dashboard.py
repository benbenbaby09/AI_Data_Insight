from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.dashboard_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/dashboards",
    tags=["dashboards"],
    route_class=LoggingAPIRoute
)

@router.get("", response_model=List[schemas.Dashboard])
def read_dashboards(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.Dashboard)
def create_dashboard(dashboard: schemas.DashboardBase, db: Session = Depends(get_db)):
    return service.create_or_update(db, dashboard)

@router.put("/{dashboard_id}", response_model=schemas.Dashboard)
def update_dashboard(dashboard_id: int, dashboard: schemas.DashboardBase, db: Session = Depends(get_db)):
    db_dashboard = service.update(db, dashboard_id, dashboard)
    if not db_dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return db_dashboard

@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, dashboard_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"ok": True}
