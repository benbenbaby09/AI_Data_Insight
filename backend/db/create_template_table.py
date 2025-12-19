from backend.db.session import engine, Base
from backend.models.orm import Template
from sqlalchemy import text

def create_template_table():
    print(f"Using database: {engine.url}")
    print("Creating 'templates' table if it doesn't exist...")
    
    # Create the table
    Base.metadata.create_all(bind=engine)
    
    # Verify
    with engine.connect() as conn:
        print("\nListing all tables in database:")
        tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        for t in tables:
            print(f"- {t[0]}")
            
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='templates'"))
        if result.fetchone():
            print("\nTable 'templates' exists successfully.")
        else:
            print("\nError: Table 'templates' was not created.")

if __name__ == "__main__":
    create_template_table()
