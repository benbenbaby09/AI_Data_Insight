from backend.db.session import engine, SessionLocal, Base
import backend.models.orm as models
from sqlalchemy import text, inspect
import json

def migrate_m2m():
    db = SessionLocal()
    try:
        # 1. Create new table dashboard_widgets
        inspector = inspect(engine)
        if not inspector.has_table("dashboard_widgets"):
            print("Creating dashboard_widgets table...")
            models.DashboardWidget.__table__.create(bind=engine)
        
        # 2. Migrate data from widgets table to dashboard_widgets
        # We need to read raw data because the ORM model for Widget has changed and won't match the DB schema yet (DB still has dashboardId)
        # However, accessing the table via SQL is safe.
        
        # Check if widgets table has dashboardId column
        columns = [c['name'] for c in inspector.get_columns("widgets")]
        if 'dashboardId' in columns and 'layout' in columns:
            print("Migrating data from widgets table...")
            widgets = db.execute(text("SELECT id, dashboardId, layout FROM widgets WHERE dashboardId IS NOT NULL")).fetchall()
            
            count = 0
            for w in widgets:
                w_id, d_id, layout = w
                
                # Check if association already exists
                exists = db.query(models.DashboardWidget).filter_by(dashboard_id=d_id, widget_id=w_id).first()
                if not exists:
                    # layout might be string or json depending on driver, but SQLAlchemy JSON type handles it.
                    # Here we are reading raw, so it might be string.
                    if isinstance(layout, str):
                        try:
                            layout = json.loads(layout)
                        except:
                            pass
                            
                    assoc = models.DashboardWidget(
                        dashboard_id=d_id,
                        widget_id=w_id,
                        layout=layout
                    )
                    db.add(assoc)
                    count += 1
            
            db.commit()
            print(f"Migrated {count} widget associations.")
            
            # Note: We are NOT dropping columns dashboardId and layout from widgets table 
            # because SQLite does not support DROP COLUMN easily and it's safer to keep data.
            # The ORM will simply ignore them.
            
        else:
            print("Widgets table does not have dashboardId/layout columns. Skipping data migration.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_m2m()
