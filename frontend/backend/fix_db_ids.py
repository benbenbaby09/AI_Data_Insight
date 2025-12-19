import sys
import os
import json
import sqlite3
import random

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db.session import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, 'ai_insight.db')

def get_int_id(val):
    if isinstance(val, int):
        return val
    if isinstance(val, str):
        if val.isdigit():
            return int(val)
        # Hash string to int if not a number string
        return abs(hash(val)) % (10**8)
    return random.randint(1000, 99999)

def fix_datasets(cursor):
    print("Fixing datasets...")
    cursor.execute("SELECT id, previewData, dataSourceIds FROM datasets")
    rows = cursor.fetchall()
    
    for row in rows:
        row_id, preview_data_json, datasource_ids_json = row
        needs_update = False
        
        # Fix previewData
        new_preview_data = None
        if preview_data_json:
            try:
                preview_data = json.loads(preview_data_json)
                if isinstance(preview_data, dict):
                    if 'id' in preview_data:
                        old_id = preview_data['id']
                        new_id = get_int_id(old_id)
                        if old_id != new_id:
                            preview_data['id'] = new_id
                            needs_update = True
                    
                    # Also fix dataSourceId in previewData if present
                    if 'dataSourceId' in preview_data and preview_data['dataSourceId'] is not None:
                        old_ds_id = preview_data['dataSourceId']
                        new_ds_id = get_int_id(old_ds_id)
                        if old_ds_id != new_ds_id:
                            preview_data['dataSourceId'] = new_ds_id
                            needs_update = True
                            
                    new_preview_data = json.dumps(preview_data)
            except Exception as e:
                print(f"Error parsing previewData for dataset {row_id}: {e}")

        # Fix dataSourceIds
        new_datasource_ids = None
        if datasource_ids_json:
            try:
                ds_ids = json.loads(datasource_ids_json)
                if isinstance(ds_ids, list):
                    new_ids = [get_int_id(i) for i in ds_ids]
                    if new_ids != ds_ids:
                        new_datasource_ids = json.dumps(new_ids)
                        needs_update = True
            except Exception as e:
                print(f"Error parsing dataSourceIds for dataset {row_id}: {e}")

        if needs_update:
            print(f"Updating dataset {row_id}")
            update_sql = "UPDATE datasets SET "
            params = []
            updates = []
            
            if new_preview_data:
                updates.append("previewData = ?")
                params.append(new_preview_data)
            else:
                # If we parsed it but didn't change it, keep original. 
                # If we failed to parse, keep original.
                # But if we changed it, new_preview_data is set.
                # Wait, if only dataSourceIds changed, new_preview_data might be None (if it was None originally or didn't change)
                # Logic: if needs_update is True, we construct the update statement.
                # If new_preview_data is None, it means either it was None originally or didn't change.
                # If it didn't change, we shouldn't update it to None if it wasn't None.
                # Better logic:
                pass

            if new_preview_data is not None:
                 # It changed
                 pass
            
            # Re-eval update logic
            u_clauses = []
            u_params = []
            if new_preview_data is not None:
                u_clauses.append("previewData = ?")
                u_params.append(new_preview_data)
            
            if new_datasource_ids is not None:
                u_clauses.append("dataSourceIds = ?")
                u_params.append(new_datasource_ids)
            
            if u_clauses:
                sql = f"UPDATE datasets SET {', '.join(u_clauses)} WHERE id = ?"
                u_params.append(row_id)
                cursor.execute(sql, tuple(u_params))

def fix_dashboards(cursor):
    print("Fixing dashboards...")
    cursor.execute("SELECT id, widgets, dataSourceIds FROM dashboards")
    rows = cursor.fetchall()
    
    for row in rows:
        row_id, widgets_json, datasource_ids_json = row
        needs_update = False
        
        # Fix widgets
        new_widgets_json = None
        if widgets_json:
            try:
                widgets = json.loads(widgets_json)
                widgets_changed = False
                if isinstance(widgets, list):
                    for widget in widgets:
                        if isinstance(widget, dict):
                            # Fix tableId
                            if 'tableId' in widget:
                                old_tid = widget['tableId']
                                new_tid = get_int_id(old_tid)
                                if old_tid != new_tid:
                                    widget['tableId'] = new_tid
                                    widgets_changed = True
                            
                            # Fix id (DashboardWidget.id is str, so no change needed)
                            
                    if widgets_changed:
                        new_widgets_json = json.dumps(widgets)
                        needs_update = True
            except Exception as e:
                print(f"Error parsing widgets for dashboard {row_id}: {e}")

        # Fix dataSourceIds
        new_datasource_ids = None
        if datasource_ids_json:
            try:
                ds_ids = json.loads(datasource_ids_json)
                if isinstance(ds_ids, list):
                    new_ids = [get_int_id(i) for i in ds_ids]
                    if new_ids != ds_ids:
                        new_datasource_ids = json.dumps(new_ids)
                        needs_update = True
            except Exception as e:
                print(f"Error parsing dataSourceIds for dashboard {row_id}: {e}")

        if needs_update:
            print(f"Updating dashboard {row_id}")
            u_clauses = []
            u_params = []
            if new_widgets_json is not None:
                u_clauses.append("widgets = ?")
                u_params.append(new_widgets_json)
            
            if new_datasource_ids is not None:
                u_clauses.append("dataSourceIds = ?")
                u_params.append(new_datasource_ids)
            
            if u_clauses:
                sql = f"UPDATE dashboards SET {', '.join(u_clauses)} WHERE id = ?"
                u_params.append(row_id)
                cursor.execute(sql, tuple(u_params))

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        fix_datasets(cursor)
        fix_dashboards(cursor)
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
