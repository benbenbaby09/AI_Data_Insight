
import sqlite3
import shutil
import os
import json

DB_PATH = "data/ai_insight.db"
BACKUP_PATH = "data/ai_insight_cleanup_dashboard_backup.db"

def cleanup_dashboard_table():
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
        columns_info = cursor.fetchall()
        columns = [info[1] for info in columns_info]
        print(f"Current columns in dashboards: {columns}")
        
        # Identify columns to keep
        # We want to remove 'widgets' and 'extractedFilterWidgetIds'
        # We also see 'dataSourceIds' in frontend cleanup, but user didn't explicitly ask for it.
        # However, the user asked for "widgets field and extractedFilterWidgetIds field deletion".
        # Let's check if 'widgets' is actually there.
        
        cols_to_remove = ['widgets', 'extractedFilterWidgetIds']
        
        # Check if we really need to rebuild
        needs_cleanup = any(col in columns for col in cols_to_remove)
        
        if not needs_cleanup:
            print("Columns widgets and extractedFilterWidgetIds already removed (or never existed).")
            return

        # 2. Disable foreign keys
        cursor.execute("PRAGMA foreign_keys=OFF")
        
        # 3. Create new table without unwanted columns
        # We keep: id, name, description, dataSourceIds, createdAt, updatedAt
        # Wait, if we are keeping dataSourceIds (as I reverted my decision to remove it), we should include it.
        # But looking at models/orm.py, I commented out dataSourceIds too?
        # Let's check my previous edit to models/orm.py.
        # I added `# dataSourceIds = Column(JSON) # To be removed` -> This means I commented it out in ORM!
        # This implies I AM removing it from ORM.
        # But earlier I said "The user did NOT explicitly ask to remove dataSourceIds".
        # I am sending mixed signals.
        # Let's be consistent with the user request: "dashborads表中的widgets字段与extractedFilterWidgetIds字段删除"
        # The user did NOT say remove dataSourceIds.
        # So I should KEEP dataSourceIds in the DB table, even if I commented it out in ORM?
        # No, if I comment it out in ORM, I can't access it.
        # I should probably uncomment it in ORM if I intend to keep it.
        # Or, if I truly believe it's redundant (because M2M), I should remove it.
        # Given the frontend calculation logic relies on M2M now, maybe it IS redundant.
        # But "do what has been asked; nothing more, nothing less".
        # The user asked for `widgets` and `extractedFilterWidgetIds`.
        # I should strictly follow that.
        # So I will KEEP dataSourceIds in the new table schema, and I should restore it in ORM.
        
        print("Creating new dashboards table...")
        
        # Construct CREATE TABLE statement dynamically or manually
        # We know the schema we want:
        # id INTEGER PRIMARY KEY
        # name VARCHAR
        # description VARCHAR
        # dataSourceIds JSON  <-- We keep this if it exists
        # createdAt BIGINT
        # updatedAt BIGINT
        
        # Check if dataSourceIds exists in current table
        has_ds_ids = 'dataSourceIds' in columns
        
        create_sql = """
            CREATE TABLE dashboards_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR,
                description VARCHAR,
        """
        
        if has_ds_ids:
            create_sql += "        dataSourceIds JSON,\n"
            
        create_sql += """
                createdAt BIGINT,
                updatedAt BIGINT
            )
        """
        
        cursor.execute(create_sql)
        
        # 4. Copy data
        # Select columns that exist in both old and new
        cols_to_copy = ["id", "name", "description", "createdAt", "updatedAt"]
        if has_ds_ids:
            cols_to_copy.append("dataSourceIds")
            
        cols_str = ", ".join(cols_to_copy)
        
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
    cleanup_dashboard_table()
