from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.db.session import get_db
from backend.schemas import base as schemas
from backend.services.template_service import TemplateService

router = APIRouter()

@router.get("/", response_model=List[schemas.Template])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    templates = TemplateService.get_templates(db, skip=skip, limit=limit)
    return templates

@router.post("/", response_model=schemas.Template)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(get_db)):
    return TemplateService.create_template(db, template)

@router.get("/{template_id}", response_model=schemas.Template)
def read_template(template_id: int, db: Session = Depends(get_db)):
    db_template = TemplateService.get_template(db, template_id=template_id)
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template

@router.put("/{template_id}", response_model=schemas.Template)
def update_template(template_id: int, template_update: schemas.TemplateUpdate, db: Session = Depends(get_db)):
    db_template = TemplateService.update_template(db, template_id=template_id, template_update=template_update)
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template

@router.delete("/{template_id}", response_model=schemas.Template)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_template = TemplateService.delete_template(db, template_id=template_id)
    if db_template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template
