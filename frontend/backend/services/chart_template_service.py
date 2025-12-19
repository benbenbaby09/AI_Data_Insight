from sqlalchemy.orm import Session
import time
from backend.models import Widget
from backend.schemas import ChartTemplateBase, ChartTemplate

def map_widget_to_template(widget: Widget) -> ChartTemplate:
    config = widget.config or {}
    return ChartTemplate(
        id=widget.id,
        name=widget.name,
        description=widget.description,
        isCustom=config.get('isCustom', False),
        type=config.get('type', 'bar'),
        icon=config.get('icon', 'LayoutTemplate'),
        customSpec=config.get('customSpec'),
        chartParams=config.get('chartParams')
    )

def get_all(db: Session):
    # Only fetch widgets with a name (templates)
    widgets = db.query(Widget).filter(Widget.type == 'chart', Widget.name != None).all()
    return [map_widget_to_template(w) for w in widgets]

def get_by_id(db: Session, id: int):
    widget = db.query(Widget).filter(Widget.id == id, Widget.type == 'chart').first()
    if not widget:
        return None
    return map_widget_to_template(widget)

def create(db: Session, temp: ChartTemplateBase):
    config = {
        'isCustom': temp.isCustom,
        'type': temp.type,
        'icon': temp.icon,
        'customSpec': temp.customSpec.dict() if temp.customSpec else None,
        'chartParams': temp.chartParams
    }
    
    db_widget = Widget(
        name=temp.name,
        description=temp.description,
        config=config,
        type='chart',
        createdAt=int(time.time() * 1000)
    )
    # If ID exists, it might error if auto-increment is used, but here ID is passed?
    # Usually ID is auto-generated.
    # The frontend seems to pass ID for update, or maybe 0 for create?
    # Let's check if we should let DB handle ID.
    if temp.id and temp.id > 0:
        db_widget.id = temp.id
        
    db.add(db_widget)
    db.commit()
    db.refresh(db_widget)
    return map_widget_to_template(db_widget)

def update(db: Session, id: int, temp: ChartTemplateBase):
    db_widget = db.query(Widget).filter(Widget.id == id).first()
    if not db_widget:
        return None
    
    db_widget.name = temp.name
    db_widget.description = temp.description
    
    config = db_widget.config or {}
    config.update({
        'isCustom': temp.isCustom,
        'type': temp.type,
        'icon': temp.icon,
        'customSpec': temp.customSpec.dict() if temp.customSpec else None,
        'chartParams': temp.chartParams
    })
    db_widget.config = config
    # Force update if config is a dict (SQLAlchemy might not detect JSON change inside dict)
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_widget, "config")
    
    import time
    db_widget.updatedAt = int(time.time() * 1000)
    
    db.commit()
    db.refresh(db_widget)
    return map_widget_to_template(db_widget)

def delete(db: Session, id: int):
    db_widget = db.query(Widget).filter(Widget.id == id).first()
    if not db_widget:
        return False
    
    db.delete(db_widget)
    db.commit()
    return True
