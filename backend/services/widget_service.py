from sqlalchemy.orm import Session
from backend.models import Widget
from backend.schemas import WidgetCreate, WidgetUpdate
import time

def get_all(db: Session, type: str = None):
    query = db.query(Widget)
    if type:
        query = query.filter(Widget.type == type)
    return query.all()

def get_by_id(db: Session, widget_id: int):
    return db.query(Widget).filter(Widget.id == widget_id).first()

def create(db: Session, widget: WidgetCreate):
    db_widget = Widget(
        name=widget.name,
        description=widget.description,
        type=widget.type,
        content=widget.content,
        config=widget.config,
        datasetId=widget.datasetId,
        createdAt=int(time.time() * 1000)
    )
    db.add(db_widget)
    db.commit()
    db.refresh(db_widget)
    return db_widget

def update(db: Session, widget_id: int, widget: WidgetUpdate):
    db_widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not db_widget:
        return None
    
    update_data = widget.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_widget, key, value)

    # Handle config update explicitly if needed, but setattr handles JSON usually.
    # If config is a dict, we might need flag_modified if we were modifying it in place,
    # but here we are replacing it.
    
    db_widget.updatedAt = int(time.time() * 1000)
    
    db.commit()
    db.refresh(db_widget)
    return db_widget

def delete(db: Session, widget_id: int):
    db_widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not db_widget:
        return False
    
    db.delete(db_widget)
    db.commit()
    return True
