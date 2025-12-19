import sqlite3
import shutil
import os
import json

DB_PATH = "data/ai_insight.db"
BACKUP_PATH = "data/ai_insight.db.backup_dashboard_ds_cleanup"

def cleanup_dashboard_ds_ids():
    if not os.path.exists(DB_PATH):
        print("Database file not found.")
        return

    # Backup
    print(f"Backing up database to {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Check existing columns
        cursor.execute("PRAGMA table_info(dashboards)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Current columns in dashboards: {columns}")
        
        # Check if cleanup is needed
        if 'dataSourceIds' not in columns:
            print("Column dataSourceIds already removed.")
            return

        # 2. Disable foreign keys
        cursor.execute("PRAGMA foreign_keys=OFF")
        
        # 3. Create new table
        # id, name, description, createdAt, updatedAt
        print("Creating new dashboards table...")
        cursor.execute("""
            CREATE TABLE dashboards_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR,
                description VARCHAR,
                createdAt BIGINT,
                updatedAt BIGINT
            )
        """)
        
        # 4. Copy data
        # We select columns that exist in both
        common_cols = ["id", "name", "description", "createdAt", "updatedAt"]
        
        cols_str = ", ".join(common_cols)
        
        print(f"Copying data... (Columns: {cols_str})")
        cursor.execute(f"INSERT INTO dashboards_new ({cols_str}) SELECT {cols_str} FROM dashboards")
        
        # 5. Drop old table
        print("Dropping old dashboards table...")
        cursor.execute("DROP TABLE dashboards")
        
        # 6. Rename new table
        print("Renaming dashboards_new to dashboards...")
        cursor.execute("ALTER TABLE dashboards_new RENAME TO dashboards")
        
        # 7. Create indices
        print("Creating indices...")
        cursor.execute("CREATE INDEX ix_dashboards_id ON dashboards (id)")
        cursor.execute("CREATE INDEX ix_dashboards_name ON dashboards (name)")
        
        # 8. Re-enable foreign keys
        cursor.execute("PRAGMA foreign_keys=ON")
        
        conn.commit()
        print("Cleanup successful.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup_dashboard_ds_ids()
