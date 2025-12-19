from sqlalchemy.orm import Session
from backend.models import Dashboard, Widget, DashboardWidget
from backend.schemas import DashboardBase
import json

def ensure_config(config, widget):
    if not config:
        config = {}
    
    # Ensure required fields exist
    if "type" not in config:
        config["type"] = "custom"
    if "xAxisKey" not in config:
        config["xAxisKey"] = ""
    if "dataKeys" not in config:
        config["dataKeys"] = []
    if "title" not in config:
        config["title"] = widget.name or "Untitled"
    if "description" not in config:
        config["description"] = widget.description or ""
        
    return config

def get_all(db: Session):
    dashboards = db.query(Dashboard).all()
    # Serialize logic is handled by Pydantic response_model in router, 
    # but we need to ensure the 'widgets' property on Dashboard object is populated with layouts.
    # The property in ORM model returns only Widget objects. 
    # We need to enrich them or rely on custom serialization.
    # However, standard Pydantic from_attributes=True reads attributes.
    # DashboardBase expects widgets: List[DashboardWidget] (which has layout).
    # Widget ORM model no longer has layout.
    # So if we return Dashboard ORM object, Pydantic will try to read dashboard.widgets[i].layout -> Fails.
    
    # Strategy: We construct the response manually or monkey-patch the objects.
    # Cleaner: Return a list of dicts or objects that match the schema.
    
    results = []
    for d in dashboards:
        widgets_with_layout = []
        for assoc in d.widget_associations:
            w = assoc.widget
            # Reconstruct the "DashboardWidget" shape expected by frontend/schema
            w_dict = {
                "id": w.id,
                "datasetId": w.datasetId,
                "config": ensure_config(w.config, w),
                "timestamp": w.createdAt, # Map DB createdAt to schema timestamp
                "layout": assoc.layout, # Get layout from association
                "name": w.name,
                "description": w.description
            }
            widgets_with_layout.append(w_dict)
            
        # Sort widgets by layout index 'i' to ensure consistent order
        widgets_with_layout.sort(key=lambda x: (x['layout'] or {}).get('i', 0))

        d_dict = d.__dict__.copy()
        d_dict['widgets'] = widgets_with_layout
        results.append(d_dict)
        
    return results

def get_by_id(db: Session, id: int):
    d = db.query(Dashboard).filter(Dashboard.id == id).first()
    if not d:
        return None
        
    widgets_with_layout = []
    for assoc in d.widget_associations:
        w = assoc.widget
        w_dict = {
            "id": w.id,
            "datasetId": w.datasetId,
            "config": ensure_config(w.config, w),
            "timestamp": w.createdAt,
            "layout": assoc.layout,
            "name": w.name,
            "description": w.description
        }
        widgets_with_layout.append(w_dict)
        
    # Sort widgets by layout index 'i' to ensure consistent order
    widgets_with_layout.sort(key=lambda x: (x['layout'] or {}).get('i', 0))

    d_dict = d.__dict__.copy()
    d_dict['widgets'] = widgets_with_layout
    return d_dict

def sync_widgets(db: Session, db_dashboard: Dashboard, widgets_data: list):
    # Map existing associations by Widget ID
    existing_assocs_map = {assoc.widget_id: assoc for assoc in db_dashboard.widget_associations}
    
    incoming_ids = set()
    
    for w_data in widgets_data:
        ds_id = w_data.datasetId
        if isinstance(ds_id, str) and ds_id.isdigit():
             ds_id = int(ds_id)
        elif isinstance(ds_id, str) and not ds_id:
             ds_id = None

        # Check if ID is an integer (existing widget ID)
        if isinstance(w_data.id, int):
            # Two cases:
            # 1. Widget is already associated with this dashboard (Update association layout)
            # 2. Widget exists in DB but not associated (Add association)
            
            # Check if widget exists in DB
            existing_widget = db.query(Widget).get(w_data.id)
            
            if existing_widget:
                # Update/Create Association
                if w_data.id in existing_assocs_map:
                    # Update Layout
                    assoc = existing_assocs_map[w_data.id]
                    assoc.layout = w_data.layout.dict()
                else:
                    # Create Association
                    new_assoc = DashboardWidget(
                        dashboard_id=db_dashboard.id,
                        widget_id=existing_widget.id,
                        layout=w_data.layout.dict()
                    )
                    db.add(new_assoc)
                
                incoming_ids.add(w_data.id)
                continue

        # If we are here, it's a new widget (or ID not found)
        # Create new widget if it doesn't exist (e.g. from template or new chart)
        
        # Prepare Widget data
        # Handle Pydantic model for config
        config_dict = w_data.config.dict() if hasattr(w_data.config, 'dict') else w_data.config
        
        # Extract name and description from config (since DashboardWidget doesn't have them directly)
        w_name = config_dict.get("title", "Untitled")
        w_desc = config_dict.get("description", "")
        
        # Ensure defaults in config
        if "type" not in config_dict: config_dict["type"] = "custom"
        if "xAxisKey" not in config_dict: config_dict["xAxisKey"] = ""
        if "dataKeys" not in config_dict: config_dict["dataKeys"] = []
        
        widget_data = {
            "datasetId": w_data.datasetId,
            "name": w_name,
            "description": w_desc,
            "config": config_dict,
            "type": config_dict.get("type", "custom"),
            "createdAt": w_data.timestamp or 0,
            "updatedAt": 0
        }

        # Create Widget
        new_w = Widget(**widget_data)
        db.add(new_w)
        db.flush() # Get ID
        
        # Create Association
        new_assoc = DashboardWidget(
            dashboard_id=db_dashboard.id,
            widget_id=new_w.id,
            layout=w_data.layout.dict()
        )
        db.add(new_assoc)
        # No need to add to incoming_ids as it wasn't in existing_assocs_map
    
    # Remove missing associations (Remove widget from dashboard)
    # Note: We do NOT delete the Widget itself, as it might be used elsewhere or saved.
    # Unless it's an orphan?
    # For now, safe approach: just remove association.
    for w_id, assoc in existing_assocs_map.items():
        if w_id not in incoming_ids:
            db.delete(assoc)

def create_or_update(db: Session, dashboard: DashboardBase):
    existing = db.query(Dashboard).filter(Dashboard.id == dashboard.id).first()
    
    if existing:
        existing.name = dashboard.name
        existing.description = dashboard.description
        existing.updatedAt = dashboard.updatedAt
        
        sync_widgets(db, existing, dashboard.widgets)
        
        db.commit()
        db.refresh(existing)
        return get_by_id(db, existing.id) # Return enriched dict

    db_dashboard = Dashboard(
        id=dashboard.id,
        name=dashboard.name,
        description=dashboard.description,
        createdAt=dashboard.createdAt,
        updatedAt=dashboard.updatedAt
    )
    db.add(db_dashboard)
    db.flush() # Get ID if needed, though ID is passed
    
    # Add widgets
    sync_widgets(db, db_dashboard, dashboard.widgets)
        
    db.commit()
    db.refresh(db_dashboard)
    return get_by_id(db, db_dashboard.id)

def update(db: Session, id: int, dashboard: DashboardBase):
    db_dashboard = db.query(Dashboard).filter(Dashboard.id == id).first()
    if not db_dashboard:
        return None
    
    db_dashboard.name = dashboard.name
    db_dashboard.description = dashboard.description
    db_dashboard.updatedAt = dashboard.updatedAt
    
    sync_widgets(db, db_dashboard, dashboard.widgets)
    
    db.commit()
    db.refresh(db_dashboard)
    return get_by_id(db, db_dashboard.id)

def delete(db: Session, id: int):
    db_dashboard = db.query(Dashboard).filter(Dashboard.id == id).first()
    if not db_dashboard:
        return False
    
    db.delete(db_dashboard)
    db.commit()
    return True
