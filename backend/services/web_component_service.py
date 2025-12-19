from sqlalchemy.orm import Session
from backend.models import Widget
from backend.schemas import WebComponentTemplateBase, WebComponentTemplate
import time

def map_widget_to_template(widget: Widget) -> WebComponentTemplate:
    return WebComponentTemplate(
        id=widget.id,
        name=widget.name,
        description=widget.description,
        code=widget.content or "",
        createdAt=widget.createdAt or 0
    )

def get_all(db: Session):
    # Only fetch widgets with a name (templates)
    widgets = db.query(Widget).filter(Widget.type == 'web', Widget.name != None).all()
    return [map_widget_to_template(w) for w in widgets]

def get_by_id(db: Session, id: int):
    widget = db.query(Widget).filter(Widget.id == id, Widget.type == 'web').first()
    if not widget:
        return None
    return map_widget_to_template(widget)

def create_or_update(db: Session, comp: WebComponentTemplateBase):
    # Check if ID exists (if passed)
    existing = None
    if comp.id > 0:
        existing = db.query(Widget).filter(Widget.id == comp.id).first()
    
    if existing:
        existing.name = comp.name
        existing.description = comp.description
        existing.content = comp.code
        existing.datasetId = comp.datasetId
        existing.updatedAt = int(time.time() * 1000)
        # componentType should already be 'web'
        
        db.commit()
        db.refresh(existing)
        return map_widget_to_template(existing)
        
    db_widget = Widget(
        # id=comp.id, # Let DB auto-increment if 0?
        name=comp.name,
        description=comp.description,
        content=comp.code,
        type='web',
        datasetId=comp.datasetId,
        createdAt=comp.createdAt or int(time.time() * 1000),
        config={} # Initialize empty config
    )
    
    if comp.id > 0:
        db_widget.id = comp.id

    db.add(db_widget)
    db.commit()
    db.refresh(db_widget)
    return map_widget_to_template(db_widget)

def delete(db: Session, id: int):
    widget = db.query(Widget).filter(Widget.id == id).first()
    if not widget:
        return False
    
    db.delete(widget)
    db.commit()
    return True
