from sqlalchemy.orm import Session
from backend.models import orm as models
from backend.schemas import base as schemas
import time

class TemplateService:
    @staticmethod
    def get_templates(db: Session, skip: int = 0, limit: int = 100, category: str = None):
        query = db.query(models.Template)
        if category:
            query = query.filter(models.Template.category == category)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def create_template(db: Session, template: schemas.TemplateCreate):
        db_template = models.Template(
            name=template.name,
            description=template.description,
            type=template.type,
            category=template.category,
            content=template.content,
            config=template.config,
            icon=template.icon,
            createdAt=int(time.time() * 1000),
            updatedAt=int(time.time() * 1000)
        )
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def get_template(db: Session, template_id: int):
        return db.query(models.Template).filter(models.Template.id == template_id).first()

    @staticmethod
    def update_template(db: Session, template_id: int, template_update: schemas.TemplateUpdate):
        db_template = db.query(models.Template).filter(models.Template.id == template_id).first()
        if not db_template:
            return None
        
        update_data = template_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_template, key, value)
            
        db_template.updatedAt = int(time.time() * 1000)
        
        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def delete_template(db: Session, template_id: int):
        db_template = db.query(models.Template).filter(models.Template.id == template_id).first()
        if not db_template:
            return None
        
        db.delete(db_template)
        db.commit()
        return db_template
