from backend.db.session import SessionLocal
from sqlalchemy import text

def check_sources():
    db = SessionLocal()
    try:
        results = db.execute(text("SELECT id, name FROM data_sources")).fetchall()
        print(f"Data Sources: {results}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sources()
