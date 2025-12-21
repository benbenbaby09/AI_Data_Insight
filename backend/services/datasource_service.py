from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import Session
from backend.schemas.base import ExecuteSqlRequest, PreviewTableRequest, TestConnectionRequest, ConnectionTestResult, DataSourceBase
from backend.models.orm import DataSource, TableEntry
import pandas as pd
import json

def _simplify_text(text: str) -> str:
    """Helper to extract simple text from potential JSON string"""
    if not text: return ""
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            for key in ['summary', 'short_description', 'overview', 'description', 'content']:
                if key in data and isinstance(data[key], str):
                    return data[key]
        return text # Fallback
    except:
        return text

def _generate_simple_annotation(table_name: str, table_desc: str, columns: list) -> str:
    """Generates a text summary of table and columns"""
    lines = []
    
    # Table info
    lines.append(f"表名: {table_name}")
    simple_desc = _simplify_text(table_desc)
    if simple_desc:
        lines.append(f"表说明: {simple_desc}")
        
    lines.append("字段列表:")
    for col in columns:
        c_name = col.name
        c_alias = col.alias or ""
        c_type = col.type
        c_desc = _simplify_text(col.description)
        
        # Format: name (alias) [type] : desc
        line_parts = [c_name]
        if c_alias and c_alias != c_name:
            line_parts.append(f"({c_alias})")
        
        line_parts.append(f"[{c_type}]")
        
        if c_desc:
            line_parts.append(f": {c_desc}")
            
        lines.append(" ".join(line_parts))
        
    return "\n".join(lines)

def _get_connection_url(type, user, password, host, port, database=None, serviceName=None):
    password = password or ""
    if type == 'mysql':
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    elif type == 'postgres':
        db = database or 'postgres'
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    elif type == 'oracle':
        service = serviceName or 'ORCL'
        return f"oracle+oracledb://{user}:{password}@{host}:{port}/?service_name={service}"
    else:
        raise ValueError(f"Unsupported database type: {type}")

def _get_connect_args(type):
    if type in ['mysql', 'postgres']:
        return {'connect_timeout': 10}
    return {}

def test_connection(request: TestConnectionRequest) -> ConnectionTestResult:
    try:
        url = _get_connection_url(request.type, request.username, request.password, request.host, request.port, request.database, request.serviceName)
        connect_args = _get_connect_args(request.type)
        
        engine = create_engine(url, connect_args=connect_args)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return ConnectionTestResult(success=True, message="Connection successful")
    except Exception as e:
        msg = str(e)
        if "ORA-01017" in msg:
            msg = "Oracle 用户名或密码错误"
        return ConnectionTestResult(success=False, message=msg)

def list_tables(request: TestConnectionRequest) -> dict:
    try:
        url = _get_connection_url(request.type, request.username, request.password, request.host, request.port, request.database, request.serviceName)
        connect_args = _get_connect_args(request.type)
        
        engine = create_engine(url, connect_args=connect_args)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Return simple list of table objects or strings. Frontend expects 'tables'.
        # Assuming frontend handles list of strings or objects. 
        # Let's return objects to be safe if frontend expects structure.
        # But looking at previous code, simple list might be fine. 
        # Let's return list of dicts for extensibility.
        # FIX: Must provide an ID for frontend selection logic to work correctly.
        # Using table name as ID since it is unique within the database.
        table_list = [{"name": t, "id": t} for t in tables]
        
        return {"success": True, "message": "OK", "tables": table_list}
    except Exception as e:
        return {"success": False, "message": str(e), "tables": []}

def get_table_schema(request: PreviewTableRequest) -> dict:
    try:
        url = _get_connection_url(request.type, request.username, request.password, request.host, request.port, request.database, request.serviceName)
        connect_args = _get_connect_args(request.type)
        
        engine = create_engine(url, connect_args=connect_args)
        inspector = inspect(engine)
        
        # inspector.get_columns returns list of dicts: 
        # [{'name': 'col1', 'type': INTEGER(), 'nullable': True, 'default': None, ...}, ...]
        columns = inspector.get_columns(request.tableName)
        
        # Convert type objects to string representation
        serializable_columns = []
        for col in columns:
            col_def = {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable"),
                "default": str(col.get("default")) if col.get("default") else None
            }
            serializable_columns.append(col_def)
            
        return {"success": True, "message": "OK", "columns": serializable_columns}
    except Exception as e:
        return {"success": False, "message": str(e), "columns": []}

def preview_table_rows(request: PreviewTableRequest) -> dict:
    try:
        url = _get_connection_url(request.type, request.username, request.password, request.host, request.port, request.database, request.serviceName)
        connect_args = _get_connect_args(request.type)
        
        engine = create_engine(url, connect_args=connect_args)
        
        # Safety: table name should be quoted or handled by sqlalchemy
        # But inspector.get_table_names() returns raw names.
        # We should use text() with quoting or simple string interpolation if trusted?
        # Better to use proper selecting.
        
        limit = request.limit or 20
        
        # Different DBs have different quoting.
        # Simplest is to just query.
        
        table_name = request.tableName
        
        if request.type == 'oracle':
             query = text(f'SELECT * FROM "{table_name}" WHERE ROWNUM <= :lim')
             # Oracle often needs quotes if case sensitive, or no quotes if default.
             # Assuming standard access.
             if not table_name.startswith('"') and not table_name.isupper():
                 # Heuristic: try querying directly.
                 query = text(f"SELECT * FROM {table_name} WHERE ROWNUM <= :lim")
        elif request.type == 'mysql':
             query = text(f"SELECT * FROM {table_name} LIMIT :lim")
        else: # postgres
             query = text(f'SELECT * FROM "{table_name}" LIMIT :lim')
        
        rows = []
        column_names = []
        with engine.connect() as conn:
            result = conn.execute(query, {"lim": limit})
            columns = result.keys()
            column_names = list(columns)
            
            for r in result.fetchall():
                row_dict = {}
                for i, col in enumerate(columns):
                    val = r[i]
                    if isinstance(val, bytes):
                        try:
                            val = val.decode('utf-8')
                        except:
                            val = str(val)
                    row_dict[col] = val
                rows.append(row_dict)
                
        return {"success": True, "message": "OK", "rows": rows, "columns": column_names}
    except Exception as e:
        return {"success": False, "message": str(e), "rows": []}

def execute_sql(request: ExecuteSqlRequest) -> dict:
    db_type = request.type
    user = request.username
    password = request.password
    host = request.host
    port = request.port
    sql = request.sql
    limit = request.limit or 100

    # Basic safety check: prevent obviously dangerous commands
    forbidden_keywords = ["DROP ", "DELETE ", "TRUNCATE ", "ALTER ", "UPDATE ", "INSERT ", "GRANT ", "REVOKE "]
    upper_sql = sql.upper()
    for kw in forbidden_keywords:
        if kw in upper_sql:
             return {"success": False, "message": f"为了安全起见，禁止执行 {kw.strip()} 操作", "rows": []}

    try:
        url = _get_connection_url(db_type, user, password, host, port, request.database, request.serviceName)
        connect_args = _get_connect_args(db_type)
            
        if db_type == 'mysql':
            sql = sql.strip()
            if sql.endswith(';'):
                sql = sql[:-1]
            wrapped_sql = f"SELECT * FROM ({sql}) AS sub_wrapper LIMIT :lim"
            query = text(wrapped_sql)
            params = {"lim": limit}

        elif db_type == 'postgres':
            sql = sql.strip()
            if sql.endswith(';'):
                sql = sql[:-1]
            wrapped_sql = f"SELECT * FROM ({sql}) AS sub_wrapper LIMIT :lim"
            query = text(wrapped_sql)
            params = {"lim": limit}

        elif db_type == 'oracle':
            sql = sql.strip()
            if sql.endswith(';'):
                sql = sql[:-1]
            wrapped_sql = f"SELECT * FROM ({sql}) WHERE ROWNUM <= :lim"
            query = text(wrapped_sql)
            params = {"lim": limit}
        else:
             return {"success": False, "message": f"Unsupported database type: {db_type}", "rows": []}

        engine = create_engine(url, connect_args=connect_args)
        
        rows = []
        column_names = []
        with engine.connect() as conn:
            result = conn.execute(query, params)
            columns = result.keys()
            column_names = list(columns)
            
            for r in result.fetchall():
                row_dict = {}
                for i, col in enumerate(columns):
                    val = r[i]
                    if isinstance(val, bytes):
                        try:
                            val = val.decode('utf-8')
                        except:
                            val = str(val)
                    row_dict[col] = val
                rows.append(row_dict)
                
        return {"success": True, "message": "OK", "rows": rows, "columns": column_names}
            
    except Exception as e:
        msg = str(e)
        if "ORA-01017" in msg:
            msg = "Oracle 用户名或密码错误"
        return {"success": False, "message": msg, "rows": []}

def get_all(db: Session):
    return db.query(DataSource).all()

def create(db: Session, datasource: DataSourceBase):
    # Convert Pydantic model to DB model
    
    db_datasource = DataSource(
        name=datasource.name,
        description=datasource.description,
        config=datasource.config.dict()
    )
    
    db.add(db_datasource)
    
    # We can add tables directly to relationship, SQLAlchemy handles IDs
    for table in datasource.tables:
        db_table = TableEntry(
            name=table.name,
            description=table.description,
            simple_description=_generate_simple_annotation(table.name, table.description, table.columns),
            columns=[c.dict() for c in table.columns],
            rows=table.rows
        )
        db_datasource.tables.append(db_table)
        
    db.commit()
    db.refresh(db_datasource)
    return db_datasource

def update(db: Session, datasource_id: int, datasource: DataSourceBase):
    print(f"[Update] Updating datasource {datasource_id}")
    db_ds = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not db_ds:
        print(f"[Update] Datasource {datasource_id} not found")
        return None
        
    db_ds.name = datasource.name
    db_ds.description = datasource.description
    db_ds.config = datasource.config.dict()
    
    # Smart update for tables to preserve IDs and avoid duplicates
    # 1. Fetch existing tables
    existing_tables = db.query(TableEntry).filter(TableEntry.dataSourceId == datasource_id).all()
    print(f"[Update] Found {len(existing_tables)} existing tables for DS {datasource_id}")
    
    existing_map_by_id = {t.id: t for t in existing_tables}
    existing_map_by_name = {t.name: t for t in existing_tables}
    
    # Track which existing tables are kept/updated
    processed_ids = set()
    
    for table_data in datasource.tables:
        # Try to find existing table by ID first (handle if ID is string/int/None)
        db_table = None
        if table_data.id:
            # table_data.id might be int now, or string from legacy frontend?
            # We should assume it matches the type.
            try:
                tid = int(table_data.id)
                db_table = existing_map_by_id.get(tid)
            except:
                pass # ID is not int (e.g. temporary string), treat as new/lookup by name
        
        # If not found by ID, try by Name (to prevent duplicates if ID changed or is new)
        if not db_table:
            db_table = existing_map_by_name.get(table_data.name)
            if db_table:
                print(f"[Update] Table match by NAME: '{table_data.name}' (ID mismatch: incoming={table_data.id}, existing={db_table.id})")
        else:
            print(f"[Update] Table match by ID: '{table_data.id}' (name: {table_data.name})")
            
        if db_table:
            # Update existing
            db_table.name = table_data.name
            db_table.description = table_data.description
            db_table.simple_description = _generate_simple_annotation(table_data.name, table_data.description, table_data.columns)
            db_table.columns = [c.dict() for c in table_data.columns]
            db_table.rows = table_data.rows
            processed_ids.add(db_table.id)
        else:
            # Insert new
            print(f"[Update] Inserting NEW table: '{table_data.name}'")
            db_table = TableEntry(
                name=table_data.name,
                description=table_data.description,
                simple_description=_generate_simple_annotation(table_data.name, table_data.description, table_data.columns),
                columns=[c.dict() for c in table_data.columns],
                rows=table_data.rows,
                dataSourceId=datasource_id
            )
            db.add(db_table)
            
    # Delete tables that are no longer present
    for t in existing_tables:
        if t.id not in processed_ids:
            print(f"[Update] Deleting orphaned table: '{t.name}' (ID: {t.id})")
            db.delete(t)
            
    db.commit()
    db.refresh(db_ds)
    print(f"[Update] Successfully updated datasource {datasource_id}")
    return db_ds

def delete(db: Session, datasource_id: int):
    db_obj = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True
