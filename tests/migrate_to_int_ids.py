import sqlite3
import json
import os

db_path = 'data/ai_insight.db'
backup_path = 'data/ai_insight.db.bak'

def migrate():
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    # Create backup
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"Created backup at {backup_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("BEGIN TRANSACTION")

        # --- Mappings ---
        ds_map = {} # old_id -> new_id (int)
        table_map = {} # old_id -> new_id (int)
        
        # --- 1. Data Sources ---
        print("Migrating Data Sources...")
        cursor.execute("SELECT * FROM data_sources")
        data_sources = cursor.fetchall()
        
        cursor.execute("ALTER TABLE data_sources RENAME TO data_sources_old")
        cursor.execute("DROP INDEX IF EXISTS ix_data_sources_id")
        cursor.execute("DROP INDEX IF EXISTS ix_data_sources_name")
        
        cursor.execute("""
        CREATE TABLE data_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            config JSON
        )
        """)
        cursor.execute("CREATE INDEX ix_data_sources_id ON data_sources (id)")
        cursor.execute("CREATE INDEX ix_data_sources_name ON data_sources (name)")
        
        for ds in data_sources:
            cursor.execute(
                "INSERT INTO data_sources (name, description, config) VALUES (?, ?, ?)",
                (ds['name'], ds['description'], ds['config'])
            )
            new_id = cursor.lastrowid
            ds_map[ds['id']] = new_id
            print(f"  DS: {ds['id']} -> {new_id}")

        # --- 2. Tables ---
        print("Migrating Tables...")
        cursor.execute("SELECT * FROM tables")
        tables = cursor.fetchall()
        
        cursor.execute("ALTER TABLE tables RENAME TO tables_old")
        cursor.execute("DROP INDEX IF EXISTS ix_tables_dataSourceId")
        cursor.execute("DROP INDEX IF EXISTS ix_tables_id")
        cursor.execute("DROP INDEX IF EXISTS ix_tables_name")
        
        cursor.execute("""
        CREATE TABLE tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            columns JSON,
            rows JSON,
            "dataSourceId" INTEGER,
            FOREIGN KEY("dataSourceId") REFERENCES "data_sources" (id)
        )
        """)
        cursor.execute('CREATE INDEX "ix_tables_dataSourceId" ON tables ("dataSourceId")')
        cursor.execute('CREATE INDEX ix_tables_id ON tables (id)')
        cursor.execute('CREATE INDEX ix_tables_name ON tables (name)')
        
        for table in tables:
            old_ds_id = table['dataSourceId']
            new_ds_id = ds_map.get(old_ds_id)
            
            if new_ds_id is None:
                print(f"  Warning: Table {table['id']} references unknown DS {old_ds_id}. Skipping.")
                continue
                
            cursor.execute(
                """INSERT INTO tables (name, description, columns, rows, "dataSourceId") 
                   VALUES (?, ?, ?, ?, ?)""",
                (table['name'], table['description'], table['columns'], table['rows'], new_ds_id)
            )
            new_id = cursor.lastrowid
            table_map[table['id']] = new_id
            # print(f"  Table: {table['id']} -> {new_id}")

        # --- 3. Dashboards ---
        print("Migrating Dashboards...")
        cursor.execute("SELECT * FROM dashboards")
        dashboards = cursor.fetchall()
        
        cursor.execute("ALTER TABLE dashboards RENAME TO dashboards_old")
        cursor.execute("DROP INDEX IF EXISTS ix_dashboards_id")
        cursor.execute("DROP INDEX IF EXISTS ix_dashboards_name")
        
        cursor.execute("""
        CREATE TABLE dashboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            "dataSourceIds" JSON,
            widgets JSON,
            "createdAt" BIGINT,
            "updatedAt" BIGINT,
            "extractedFilterWidgetIds" JSON
        )
        """)
        cursor.execute("CREATE INDEX ix_dashboards_id ON dashboards (id)")
        cursor.execute("CREATE INDEX ix_dashboards_name ON dashboards (name)")
        
        for db in dashboards:
            # Update dataSourceIds
            old_ds_ids = json.loads(db['dataSourceIds'])
            new_ds_ids = [ds_map[old] for old in old_ds_ids if old in ds_map]
            
            # Update widgets table references
            widgets = json.loads(db['widgets'])
            for w in widgets:
                if 'tableId' in w and w['tableId']:
                    if w['tableId'] in table_map:
                        w['tableId'] = table_map[w['tableId']]
                    # If not found, it might be a table NAME (legacy logic support), leave as is or clear? 
                    # The logic in App.tsx: const tableId = table ? table.id : tableName;
                    # So it might be a string name. If it looks like an ID (tbl_...), it's broken.
                    # If it's a name, it's fine (but we are changing IDs to int, so string is distinct).
            
            # Update extractedFilterWidgetIds? They are widget IDs, not table IDs. Widget IDs are inside the widget config.
            # Wait, widgets have their own IDs ("w_..."). 
            # The prompt says "All database tables primary keys". 
            # Does this include JSON objects inside? No, just the DB tables.
            # But wait, widgets are not in a separate DB table, they are JSON.
            # So widget IDs can remain strings? "w_..."
            # The user said "所有数据库表的主键" (All database tables primary keys). 
            # So widget IDs (inside JSON) don't strictly *have* to change, but table/ds IDs do.
            
            cursor.execute(
                """INSERT INTO dashboards (name, description, "dataSourceIds", widgets, "createdAt", "updatedAt", "extractedFilterWidgetIds") 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (db['name'], db['description'], json.dumps(new_ds_ids), json.dumps(widgets), db['createdAt'], db['updatedAt'], db['extractedFilterWidgetIds'])
            )

        # --- 4. Datasets ---
        print("Migrating Datasets...")
        cursor.execute("SELECT * FROM datasets")
        datasets = cursor.fetchall()
        
        cursor.execute("ALTER TABLE datasets RENAME TO datasets_old")
        cursor.execute("DROP INDEX IF EXISTS ix_datasets_id")
        cursor.execute("DROP INDEX IF EXISTS ix_datasets_name")
        
        cursor.execute("""
        CREATE TABLE datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            "dataSourceIds" JSON,
            sql VARCHAR,
            "previewData" JSON,
            "createdAt" BIGINT
        )
        """)
        cursor.execute("CREATE INDEX ix_datasets_id ON datasets (id)")
        cursor.execute("CREATE INDEX ix_datasets_name ON datasets (name)")
        
        for ds in datasets:
            old_ds_ids = json.loads(ds['dataSourceIds'])
            new_ds_ids = [ds_map[old] for old in old_ds_ids if old in ds_map]
            
            cursor.execute(
                """INSERT INTO datasets (name, description, "dataSourceIds", sql, "previewData", "createdAt") 
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (ds['name'], ds['description'], json.dumps(new_ds_ids), ds['sql'], ds['previewData'], ds['createdAt'])
            )

        # --- 5. Chart Templates ---
        print("Migrating Chart Templates...")
        cursor.execute("SELECT * FROM chart_templates")
        templates = cursor.fetchall()
        
        cursor.execute("ALTER TABLE chart_templates RENAME TO chart_templates_old")
        cursor.execute("DROP INDEX IF EXISTS ix_chart_templates_id")
        
        cursor.execute("""
        CREATE TABLE chart_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            "isCustom" BOOLEAN,
            type VARCHAR,
            icon VARCHAR,
            "customSpec" JSON,
            "chartParams" JSON
        )
        """)
        cursor.execute("CREATE INDEX ix_chart_templates_id ON chart_templates (id)")
        
        for tpl in templates:
            cursor.execute(
                """INSERT INTO chart_templates (name, description, "isCustom", type, icon, "customSpec", "chartParams") 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (tpl['name'], tpl['description'], tpl['isCustom'], tpl['type'], tpl['icon'], tpl['customSpec'], tpl['chartParams'])
            )

        # --- 6. Web Components ---
        print("Migrating Web Components...")
        cursor.execute("SELECT * FROM web_components")
        components = cursor.fetchall()
        
        cursor.execute("ALTER TABLE web_components RENAME TO web_components_old")
        cursor.execute("DROP INDEX IF EXISTS ix_web_components_id")
        
        cursor.execute("""
        CREATE TABLE web_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description VARCHAR,
            code VARCHAR,
            "createdAt" BIGINT
        )
        """)
        cursor.execute("CREATE INDEX ix_web_components_id ON web_components (id)")
        
        for comp in components:
            cursor.execute(
                """INSERT INTO web_components (name, description, code, "createdAt") 
                   VALUES (?, ?, ?, ?)""",
                (comp['name'], comp['description'], comp['code'], comp['createdAt'])
            )

        # --- Cleanup ---
        print("Dropping old tables...")
        cursor.execute("DROP TABLE data_sources_old")
        cursor.execute("DROP TABLE tables_old")
        cursor.execute("DROP TABLE dashboards_old")
        cursor.execute("DROP TABLE datasets_old")
        cursor.execute("DROP TABLE chart_templates_old")
        cursor.execute("DROP TABLE web_components_old")

        conn.commit()
        print("Migration successful!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
