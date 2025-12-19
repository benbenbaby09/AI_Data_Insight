import sqlite3
import shutil
import os

DB_PATH = "data/ai_insight.db"
BACKUP_PATH = "data/ai_insight.db.backup_m2m_cleanup"

def cleanup_widget_table():
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
        cursor.execute("PRAGMA table_info(widgets)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Current columns in widgets: {columns}")
        
        if 'dashboardId' not in columns and 'layout' not in columns:
            print("Columns dashboardId and layout already removed.")
            return

        # 2. Disable foreign keys
        cursor.execute("PRAGMA foreign_keys=OFF")
        
        # 3. Create new table without dashboardId and layout
        # We need to manually define the schema as per new ORM
        # id, datasetId, name, description, config, timestamp
        
        print("Creating new widgets table...")
        cursor.execute("""
            CREATE TABLE widgets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datasetId INTEGER,
                name VARCHAR,
                description VARCHAR,
                config JSON,
                timestamp BIGINT
            )
        """)
        
        # 4. Copy data
        # We select matching columns.
        # Note: If 'name' or 'description' were added recently, they might be null in old table or not exist if migration script didn't add them?
        # Let's check if name/description exist in old table.
        # Based on previous context, they were added recently?
        # Actually, in 'orm.py' they are present. But were they added to DB?
        # The 'init_db' creates them if creating from scratch.
        # If migrating, we should check.
        
        has_name = 'name' in columns
        has_desc = 'description' in columns
        
        # Build SELECT query
        # We need to preserve ID.
        old_cols = ["id", "datasetId", "config", "timestamp"]
        new_cols = ["id", "datasetId", "config", "timestamp"]
        
        if has_name:
            old_cols.append("name")
            new_cols.append("name")
        if has_desc:
            old_cols.append("description")
            new_cols.append("description")
            
        old_cols_str = ", ".join(old_cols)
        new_cols_str = ", ".join(new_cols)
        
        print(f"Copying data... (Columns: {old_cols_str})")
        cursor.execute(f"INSERT INTO widgets_new ({new_cols_str}) SELECT {old_cols_str} FROM widgets")
        
        # 5. Drop old table
        print("Dropping old widgets table...")
        cursor.execute("DROP TABLE widgets")
        
        # 6. Rename new table
        print("Renaming widgets_new to widgets...")
        cursor.execute("ALTER TABLE widgets_new RENAME TO widgets")
        
        # 7. Create indices
        print("Creating indices...")
        cursor.execute("CREATE INDEX ix_widgets_id ON widgets (id)")
        # Note: datasetId might need index if searched frequently, but ORM usually creates it.
        # Let's verify standard indices.
        
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
    cleanup_widget_table()
