from backend.db.session import SessionLocal
from sqlalchemy import text

def check_nulls():
    db = SessionLocal()
    try:
        # Check for NULL dataSourceId
        results = db.execute(text("SELECT id, name, dataSourceId FROM datasets WHERE dataSourceId IS NULL")).fetchall()
        print(f"Found {len(results)} datasets with NULL dataSourceId:")
        for row in results:
            print(row)
            
        # Also check all datasets just in case
        all_results = db.execute(text("SELECT id, name, dataSourceId FROM datasets")).fetchall()
        print(f"Total datasets: {len(all_results)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_nulls()
