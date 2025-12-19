from backend.db.session import SessionLocal
from sqlalchemy import text

def fix_nulls():
    db = SessionLocal()
    try:
        # Get first data source ID
        source = db.execute(text("SELECT id FROM data_sources LIMIT 1")).fetchone()
        if not source:
            print("No data sources found. Cannot fix null references.")
            return

        source_id = source[0]
        print(f"Using default data source ID: {source_id}")

        # Update datasets with NULL dataSourceId
        db.execute(text("UPDATE datasets SET dataSourceId = :did WHERE dataSourceId IS NULL"), {"did": source_id})
        db.commit()
        print("Fixed NULL dataSourceId values.")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_nulls()
