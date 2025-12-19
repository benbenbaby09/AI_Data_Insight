import json
import os
from sqlalchemy.orm import Session
from backend.db.session import SessionLocal
from backend.services.dataset_service import create
from backend.schemas import DatasetBase

def migrate():
    json_path = os.path.join("data", "datasets.json")
    if not os.path.exists(json_path):
        print("No datasets.json found.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    db: Session = SessionLocal()
    try:
        count = 0
        for item in data:
            # Check if exists
            from backend.models.orm import Dataset
            existing = db.query(Dataset).filter(Dataset.id == item["id"]).first()
            if existing:
                print(f"Dataset {item['id']} already exists.")
                continue
            
            # Convert to schema
            # Pydantic model expects specific fields. 
            # item is a dict.
            # We need to make sure previewData is handled correctly.
            # In schema, previewData is Optional[PreviewTableRequest]
            # In JSON, it's a dict.
            
            # Let's try to construct DatasetBase
            try:
                ds = DatasetBase(**item)
                create(db, ds)
                print(f"Migrated dataset {item['id']}")
                count += 1
            except Exception as e:
                print(f"Failed to migrate dataset {item['id']}: {e}")
        
        print(f"Migration complete. {count} datasets migrated.")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
