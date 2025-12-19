import sqlite3
import json

db_path = 'data/ai_insight.db'

def inspect_data():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- Data Sources ---")
    cursor.execute("SELECT id, name FROM data_sources LIMIT 5")
    for row in cursor.fetchall():
        print(f"ID: {row['id']}, Name: {row['name']}")
        
    print("\n--- Tables ---")
    cursor.execute("SELECT id, name, dataSourceId FROM tables LIMIT 5")
    for row in cursor.fetchall():
        print(f"ID: {row['id']}, Name: {row['name']}, DS_ID: {row['dataSourceId']}")
        
    print("\n--- Dashboards ---")
    cursor.execute("SELECT id, dataSourceIds, widgets FROM dashboards LIMIT 5")
    for row in cursor.fetchall():
        ds_ids = json.loads(row['dataSourceIds'])
        widgets = json.loads(row['widgets'])
        print(f"ID: {row['id']}, DS_IDs: {ds_ids}")
        if widgets:
            print(f"  First Widget: {widgets[0].get('id')}, TableID: {widgets[0].get('tableId')}")

    print("\n--- Datasets ---")
    cursor.execute("SELECT id, dataSourceIds FROM datasets LIMIT 5")
    for row in cursor.fetchall():
        ds_ids = json.loads(row['dataSourceIds'])
        print(f"ID: {row['id']}, DS_IDs: {ds_ids}")

    conn.close()

if __name__ == "__main__":
    inspect_data()
