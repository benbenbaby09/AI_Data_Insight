from backend.db.session import engine, SessionLocal, Base
import backend.models as models
import time
import json
from sqlalchemy import text

def init_db():
    # Import all models to ensure they are registered with Base
    # models package __init__ imports them
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if data exists
    if db.query(models.DataSource).count() > 0:
        # Ensure new tables relation exists
        if db.query(models.TableEntry).count() == 0:
            print("Seeding TableEntry for existing data sources...")
            try:
                ds_ids = [row.id for row in db.query(models.DataSource).all()]
                for ds_id in ds_ids:
                    res = db.execute(text("SELECT tables FROM data_sources WHERE id = :id"), {"id": ds_id}).fetchone()
                    if res and res[0]:
                        try:
                            existing_tables = json.loads(res[0]) if isinstance(res[0], str) else res[0]
                        except Exception:
                            existing_tables = []
                        for t in existing_tables:
                            db.add(models.TableEntry(
                                id=t.get("id"),
                                name=t.get("name"),
                                description=t.get("description"),
                                columns=t.get("columns"),
                                rows=t.get("rows") or [],
                                dataSourceId=ds_id
                            ))
                db.commit()
                print("Seeded TableEntry from legacy JSON column.")
            except Exception as e:
                print(f"Seeding failed: {e}")

        # Check if widgets need migration
        if db.query(models.Widget).count() == 0 and db.query(models.Dashboard).count() > 0:
            print("Migrating widgets from Dashboard JSON to Widget table...")
            try:
                # We need to fetch the raw JSON from the 'widgets' column
                # Since the model no longer has the column, we use text SQL
                results = db.execute(text("SELECT id, widgets FROM dashboards")).fetchall()
                for row in results:
                    dash_id = row[0]
                    widgets_json = row[1]
                    if widgets_json:
                        # Parse JSON if it's a string (SQLite/Postgres differences)
                        if isinstance(widgets_json, str):
                            widgets_list = json.loads(widgets_json)
                        else:
                            widgets_list = widgets_json
                        
                        if widgets_list:
                            for w in widgets_list:
                                # Migration: tableId -> datasetId
                                tid = w.get('tableId')
                                if tid and isinstance(tid, str) and tid.isdigit():
                                    tid = int(tid)
                                elif tid and isinstance(tid, str):
                                    # Skip if it's not a digit (e.g. legacy string ID that is not number)
                                    # Or maybe we should keep it if we supported string IDs in DB?
                                    # DB column is Integer.
                                    tid = None
                                
                                db_widget = models.Widget(
                                    dashboardId=dash_id,
                                    datasetId=tid,
                                    config=w.get('config'),
                                    layout=w.get('layout'),
                                    timestamp=w.get('timestamp') or int(time.time() * 1000)
                                )
                                db.add(db_widget)
                db.commit()
                print("Migrated widgets successfully.")
            except Exception as e:
                print(f"Migration failed (non-critical if widgets column missing): {e}")

        # Check if datasets need migration (dataSourceIds -> dataSourceId)
        try:
            # Check if dataSourceId column exists
            # SQLite pragma
            columns = db.execute(text("PRAGMA table_info(datasets)")).fetchall()
            column_names = [col[1] for col in columns]
            
            if 'dataSourceId' not in column_names:
                print("Migrating datasets: Adding dataSourceId column...")
                db.execute(text("ALTER TABLE datasets ADD COLUMN dataSourceId INTEGER"))
                db.commit()
                
                # Migrate data
                print("Migrating datasets: moving data from dataSourceIds to dataSourceId...")
                
                # Get a default fallback data source ID just in case
                fallback_source_id = None
                first_source = db.query(models.DataSource).first()
                if first_source:
                    fallback_source_id = first_source.id
                
                # We have to read dataSourceIds using raw SQL because model definition changed
                results = db.execute(text("SELECT id, dataSourceIds FROM datasets")).fetchall()
                for row in results:
                    ds_id = row[0]
                    ids_json = row[1]
                    target_id = None
                    
                    if ids_json:
                        if isinstance(ids_json, str):
                            try:
                                ids_list = json.loads(ids_json)
                            except:
                                ids_list = []
                        else:
                            ids_list = ids_json
                        
                        if ids_list and isinstance(ids_list, list) and len(ids_list) > 0:
                            first_id = ids_list[0]
                            if isinstance(first_id, int):
                                target_id = first_id
                            elif isinstance(first_id, str) and first_id.isdigit():
                                target_id = int(first_id)
                    
                    # If no valid ID from array, use fallback
                    if target_id is None and fallback_source_id is not None:
                        target_id = fallback_source_id
                        
                    if target_id is not None:
                         db.execute(text("UPDATE datasets SET dataSourceId = :did WHERE id = :id"), {"did": target_id, "id": ds_id})

                db.commit()
                print("Datasets migration completed.")
                
        except Exception as e:
            print(f"Dataset migration check failed: {e}")

        print("Database already initialized.")
        db.close()
        return

    print("Initializing database with mock data...")

    # Create Mock Data Sources
    base_tables = [
      {
        "id": 't1',
        "name": 'SALES_Q1_2024',
        "description": '季度销售数据，包含区域和产品详细信息',
        "columns": [
          { "name": 'date', "type": 'date' },
          { "name": 'region', "type": 'string' },
          { "name": 'province', "type": 'string' },
          { "name": 'product', "type": 'string' },
          { "name": 'amount', "type": 'number' },
          { "name": 'units', "type": 'number' },
        ],
        "rows": [
          { "date": '2024-01-15', "region": 'North', "province": '北京', "product": 'Laptop X1', "amount": 15000, "units": 10 },
          { "date": '2024-01-16', "region": 'South', "province": '广东', "product": 'Laptop X1', "amount": 12000, "units": 8 },
          { "date": '2024-01-20', "region": 'East', "province": '上海', "product": 'Monitor 27 inch', "amount": 5000, "units": 20 },
          { "date": '2024-02-05', "region": 'North', "province": '河北', "product": 'Monitor 27 inch', "amount": 7500, "units": 30 },
          { "date": '2024-02-10', "region": 'West', "province": '四川', "product": 'Keyboard Pro', "amount": 2000, "units": 50 },
          { "date": '2024-03-01', "region": 'South', "province": '海南', "product": 'Laptop X1', "amount": 18000, "units": 12 },
          { "date": '2024-03-15', "region": 'East', "province": '浙江', "product": 'Mouse Wireless', "amount": 1500, "units": 60 },
          { "date": '2024-03-20', "region": 'West', "province": '陕西', "product": 'Laptop X1', "amount": 22500, "units": 15 },
        ]
      },
      {
        "id": 't2',
        "name": 'EMPLOYEE_PERFORMANCE',
        "description": '关于员工销售目标和完成情况的 HR 数据',
        "columns": [
          { "name": 'employee_id', "type": 'string' },
          { "name": 'full_name', "type": 'string' },
          { "name": 'department', "type": 'string' },
          { "name": 'target', "type": 'number' },
          { "name": 'achieved', "type": 'number' },
        ],
        "rows": [
          { "employee_id": 'E001', "full_name": 'John Doe', "department": 'Sales', "target": 50000, "achieved": 55000 },
          { "employee_id": 'E002', "full_name": 'Jane Smith', "department": 'Sales', "target": 50000, "achieved": 48000 },
          { "employee_id": 'E003', "full_name": 'Alice Brown', "department": 'Marketing', "target": 20000, "achieved": 22000 },
          { "employee_id": 'E004', "full_name": 'Bob White', "department": 'Sales', "target": 50000, "achieved": 60000 },
          { "employee_id": 'E005', "full_name": 'Charlie Green', "department": 'Marketing', "target": 20000, "achieved": 19000 },
        ]
      },
      {
        "id": 't3',
        "name": 'PROJECT_MILESTONES_2024',
        "description": '企业重点项目里程碑及实施进度追踪表',
        "columns": [
          { "name": 'project_id', "type": 'string' },
          { "name": 'project_name', "type": 'string' },
          { "name": 'phase', "type": 'string', "description": '项目阶段 (Planning, Development, Testing, etc.)' },
          { "name": 'milestone', "type": 'string' },
          { "name": 'status', "type": 'string', "description": '当前状态 (Completed, In Progress, Delayed, Pending)' },
          { "name": 'progress', "type": 'number', "description": '完成百分比 (0-100)' },
          { "name": 'due_date', "type": 'date' },
          { "name": 'owner', "type": 'string' },
        ],
        "rows": [
          { "project_id": 'P001', "project_name": 'AI 转型计划', "phase": 'Planning', "milestone": '需求调研与立项', "status": 'Completed', "progress": 100, "due_date": '2024-01-15', "owner": 'Alice' },
          { "project_id": 'P001', "project_name": 'AI 转型计划', "phase": 'Development', "milestone": '核心模型训练', "status": 'In Progress', "progress": 65, "due_date": '2024-04-30', "owner": 'Bob' },
          { "project_id": 'P001', "project_name": 'AI 转型计划', "phase": 'Testing', "milestone": 'UAT 用户验收测试', "status": 'Pending', "progress": 0, "due_date": '2024-06-15', "owner": 'Charlie' },
          { "project_id": 'P002', "project_name": 'ERP 系统升级', "phase": 'Migration', "milestone": '历史数据清洗迁移', "status": 'Delayed', "progress": 40, "due_date": '2024-03-20', "owner": 'David' },
          { "project_id": 'P002', "project_name": 'ERP 系统升级', "phase": 'Go-Live', "milestone": '系统正式上线', "status": 'Pending', "progress": 0, "due_date": '2024-05-01', "owner": 'Eve' },
          { "project_id": 'P003', "project_name": '新零售电商平台', "phase": 'Design', "milestone": 'UI/UX 交互设计', "status": 'Completed', "progress": 100, "due_date": '2024-02-10', "owner": 'Frank' },
          { "project_id": 'P003', "project_name": '新零售电商平台', "phase": 'Development', "milestone": '移动端 APP 开发', "status": 'In Progress', "progress": 85, "due_date": '2024-03-30', "owner": 'Grace' },
          { "project_id": 'P003', "project_name": '新零售电商平台', "phase": 'Marketing', "milestone": '首发营销活动策划', "status": 'In Progress', "progress": 20, "due_date": '2024-04-10', "owner": 'Helen' },
          { "project_id": 'P004', "project_name": '混合云架构迁移', "phase": 'Infrastructure', "milestone": '服务器环境部署', "status": 'Completed', "progress": 100, "due_date": '2024-02-28', "owner": 'Henry' },
        ]
      }
    ]
    
    # Generate mock tables
    mock_tables = []
    categories = ['FIN', 'HR', 'LOGISTICS', 'CRM', 'IOT', 'APP']
    for i in range(50): 
        category = categories[i % len(categories)]
        id = f"mock_t_{i + 4}"
        mock_tables.append({
            "id": id,
            "name": f"{category}_DATA_{1000 + i}",
            "description": f"系统自动生成的 {category} 业务模块测试表 {i + 1}",
            "columns": [
                { "name": 'id', "type": 'string', "description": 'Primary Key' },
                { "name": 'created_at', "type": 'date', "description": 'Creation Timestamp' },
                { "name": 'status', "type": 'string', "description": 'Status Code' },
                { "name": 'value', "type": 'number', "description": 'Measurement Value' }
            ],
            "rows": []
        })

    all_tables = base_tables + mock_tables
    
    default_ds = models.DataSource(
        id="ds_default",
        name="Default Mock DB",
        description="Built-in mock data source",
        config={
            "type": "sqlite",
            "name": "Default Mock DB",
            "host": "localhost",
            "port": "",
            "serviceName": "",
            "username": ""
        },
    )
    db.add(default_ds)
    # Persist tables as separate entities
    for t in all_tables:
        db.add(models.TableEntry(
            id=t["id"],
            name=t["name"],
            description=t.get("description"),
            columns=t.get("columns"),
            rows=t.get("rows", []),
            dataSourceId="ds_default"
        ))
    
    default_dashboard = models.Dashboard(
        id='default_db',
        name='默认仪表盘',
        description='My first dashboard',
        dataSourceIds=[],
        widgets=[],
        createdAt=int(time.time() * 1000)
    )
    db.add(default_dashboard)
    
    db.commit()
    db.close()
    print("Database initialized.")

if __name__ == "__main__":
    init_db()