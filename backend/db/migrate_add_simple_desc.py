import sqlite3
import os

def migrate():
    print("Migrating database to add simple_description column...")
    
    # Path to the database file
    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ai_insight.db')
    db_path = os.path.abspath(db_path)
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(tables)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'simple_description' not in columns:
            print("Adding simple_description column to tables table...")
            cursor.execute("ALTER TABLE tables ADD COLUMN simple_description TEXT")
            conn.commit()
            print("Migration successful!")
        else:
            print("Column simple_description already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
