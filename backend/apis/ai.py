from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
from backend.services import ai_service
from backend.utils.logging import LoggingAPIRoute
from backend.db.session import get_db

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
    route_class=LoggingAPIRoute
)

@router.post("/generate-dataset-sql")
def generate_dataset_sql(payload: Dict[str, Any], db: Session = Depends(get_db)):
    data_source_id: int = payload.get("dataSourceId")
    table_ids: List[int] = payload.get("tableIds", [])
    user_query: str = payload.get("userQuery", "")
    skip_auto_select: bool = payload.get("skipAutoSelect", False)
    return ai_service.generate_dataset_sql(db, data_source_id, table_ids, user_query, skip_auto_select)

@router.post("/select-tables")
def select_tables(payload: Dict[str, Any], db: Session = Depends(get_db)):
    data_source_id: int = payload.get("dataSourceId")
    user_query: str = payload.get("userQuery", "")
    return ai_service.auto_select_tables(db, data_source_id, user_query)

@router.post("/generate-table-annotations")
def generate_table_annotations(payload: Dict[str, Any]):
    table_name: str = payload.get("tableName", "")
    table_description: Optional[str] = payload.get("tableDescription")
    columns: List[Dict[str, str]] = payload.get("columns", [])
    return ai_service.generate_table_annotations(table_name, table_description, columns)

@router.post("/generate-data-insight")
def generate_data_insight(payload: Dict[str, Any]):
    tables: List[Dict[str, Any]] = payload.get("tables", [])
    user_query: str = payload.get("userQuery", "")
    reference_context: Optional[Dict[str, Any]] = payload.get("referenceContext")
    return ai_service.generate_data_insight(tables, user_query, reference_context)

@router.post("/generate-web-component")
def generate_web_component(payload: Dict[str, Any]):
    description: str = payload.get("description", "")
    image_base64: Optional[str] = payload.get("imageBase64")
    context_data: Optional[Dict[str, Any]] = payload.get("contextData")
    template_code: Optional[str] = payload.get("templateCode")
    return ai_service.generate_web_component(description, image_base64, context_data, template_code)

@router.post("/generate-chart-template")
def generate_chart_template(payload: Dict[str, Any]):
    description: str = payload.get("description", "")
    image_base64: Optional[str] = payload.get("imageBase64")
    return ai_service.generate_chart_template(description, image_base64)
