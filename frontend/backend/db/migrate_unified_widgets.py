import sqlite3
import json
import os
import shutil
import time

DB_PATH = "data/ai_insight.db"
BACKUP_PATH = "data/ai_insight.db.backup_unified"

def migrate():
    if not os.path.exists(DB_PATH):
        print("DB not found")
        return

    print(f"Backing up database to {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Check if already migrated
        cursor.execute("PRAGMA table_info(widgets)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'componentType' in cols:
            print("Already migrated.")
            return

        print("Creating widgets_new...")
        cursor.execute("""
            CREATE TABLE widgets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datasetId INTEGER,
                name VARCHAR,
                description VARCHAR,
                config JSON,
                componentType VARCHAR DEFAULT 'widget',
                content VARCHAR,
                createdAt BIGINT,
                updatedAt BIGINT
            )
        """)

        # 1. Migrate existing widgets
        print("Migrating widgets...")
        cursor.execute("SELECT * FROM widgets")
        widgets = cursor.fetchall()
        max_id = 0
        for w in widgets:
            wid = w['id']
            if wid > max_id: max_id = wid
            
            # timestamp -> createdAt
            created_at = w['timestamp'] if 'timestamp' in w.keys() else 0
            
            cursor.execute("""
                INSERT INTO widgets_new (id, datasetId, name, description, config, componentType, createdAt)
                VALUES (?, ?, ?, ?, ?, 'widget', ?)
            """, (wid, w['datasetId'], w['name'], w['description'], w['config'], created_at))

        # 2. Migrate Chart Templates
        print("Migrating Chart Templates...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chart_templates'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM chart_templates")
            templates = cursor.fetchall()
            for t in templates:
                max_id += 1
                
                # Handle customSpec/chartParams which might be JSON strings or None
                custom_spec = None
                if t['customSpec']:
                    try:
                        custom_spec = json.loads(t['customSpec']) if isinstance(t['customSpec'], str) else t['customSpec']
                    except:
                        custom_spec = t['customSpec']

                chart_params = None
                if t['chartParams']:
                    try:
                        chart_params = json.loads(t['chartParams']) if isinstance(t['chartParams'], str) else t['chartParams']
                    except:
                        chart_params = t['chartParams']

                config = {
                    'isCustom': t['isCustom'],
                    'type': t['type'],
                    'icon': t['icon'],
                    'customSpec': custom_spec,
                    'chartParams': chart_params
                }
                
                cursor.execute("""
                    INSERT INTO widgets_new (id, name, description, config, componentType, createdAt)
                    VALUES (?, ?, ?, ?, 'chart_template', ?)
                """, (max_id, t['name'], t['description'], json.dumps(config), 0))

        # 3. Migrate Web Components
        print("Migrating Web Components...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='web_components'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM web_components")
            webs = cursor.fetchall()
            for w in webs:
                max_id += 1
                
                cursor.execute("""
                    INSERT INTO widgets_new (id, name, description, config, componentType, content, createdAt)
                    VALUES (?, ?, ?, '{}', 'web_template', ?, ?)
                """, (max_id, w['name'], w['description'], w['code'], w['createdAt']))

        # Swap tables
        print("Swapping tables...")
        cursor.execute("DROP TABLE widgets")
        cursor.execute("ALTER TABLE widgets_new RENAME TO widgets")
        
        # Drop old tables
        cursor.execute("DROP TABLE IF EXISTS chart_templates")
        cursor.execute("DROP TABLE IF EXISTS web_components")
        
        conn.commit()
        print("Migration done.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
