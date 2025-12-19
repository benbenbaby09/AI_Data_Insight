from sqlalchemy.orm import Session
from backend.models.orm import Widget
from backend.schemas.base import SavedComponentCreate
import time

def get_all(db: Session):
    # Filter for saved components (widgets) only
    # In the unified model, these are charts with a name and a datasetId
    widgets = db.query(Widget).filter(Widget.name != None, Widget.type == 'chart', Widget.datasetId != None).all()
    
    result = []
    for w in widgets:
        result.append({
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "datasetId": w.datasetId,
            "config": w.config,
            "createdAt": w.createdAt
        })
    return result

def get_by_id(db: Session, id: int):
    w = db.query(Widget).filter(Widget.id == id, Widget.type == 'chart').first()
    if w:
        return {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "datasetId": w.datasetId,
            "config": w.config,
            "createdAt": w.createdAt
        }
    return None

def create(db: Session, comp: SavedComponentCreate):
    db_comp = Widget(
        name=comp.name,
        description=comp.description,
        datasetId=comp.datasetId,
        config=comp.config.dict(),
        type='chart',
        createdAt=int(time.time() * 1000)
    )
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    
    return {
        "id": db_comp.id,
        "name": db_comp.name,
        "description": db_comp.description,
        "datasetId": db_comp.datasetId,
        "config": db_comp.config,
        "createdAt": db_comp.createdAt
    }

def delete(db: Session, id: int):
    db_comp = db.query(Widget).filter(Widget.id == id).first()
    if not db_comp:
        return False
    
    db.delete(db_comp)
    db.commit()
    return True
