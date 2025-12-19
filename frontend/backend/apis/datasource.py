from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import backend.schemas as schemas
from backend.db.session import get_db
import backend.services.datasource_service as service
from backend.utils.logging import LoggingAPIRoute

router = APIRouter(
    prefix="/api/datasources",
    tags=["datasources"],
    route_class=LoggingAPIRoute
)

@router.post("/test-connection", response_model=schemas.ConnectionTestResult)
def test_connection(request: schemas.TestConnectionRequest):
    return service.test_connection(request)

@router.post("/list-tables")
def list_tables(request: schemas.TestConnectionRequest):
    return service.list_tables(request)

@router.post("/get-table-schema")
def get_table_schema(request: schemas.PreviewTableRequest):
    return service.get_table_schema(request)

@router.post("/preview-table")
def preview_table(request: schemas.PreviewTableRequest):
    return service.preview_table_rows(request)

@router.post("/execute-sql")
def execute_sql(request: schemas.ExecuteSqlRequest):
    return service.execute_sql(request)

@router.get("", response_model=List[schemas.DataSource])
def read_datasources(db: Session = Depends(get_db)):
    return service.get_all(db)

@router.post("", response_model=schemas.DataSource)
def create_datasource(datasource: schemas.DataSourceBase, db: Session = Depends(get_db)):
    db_datasource = service.create(db, datasource)
    if not db_datasource:
        raise HTTPException(status_code=400, detail="DataSource already exists")
    return db_datasource

@router.put("/{datasource_id}", response_model=schemas.DataSource)
def update_datasource(datasource_id: int, datasource: schemas.DataSourceBase, db: Session = Depends(get_db)):
    db_datasource = service.update(db, datasource_id, datasource)
    if not db_datasource:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return db_datasource

@router.delete("/{datasource_id}")
def delete_datasource(datasource_id: int, db: Session = Depends(get_db)):
    success = service.delete(db, datasource_id)
    if not success:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return {"ok": True}
