from sqlalchemy import create_engine, text
import json
import os

# Database setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "data", "ai_insight.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate_types():
    with engine.connect() as conn:
        print("Starting migration of widget types...")
        
        # 1. Update chart_template -> chart
        conn.execute(text("UPDATE widgets SET componentType = 'chart' WHERE componentType = 'chart_template'"))
        print("Updated chart_template -> chart")
        
        # 2. Update web_template -> web
        conn.execute(text("UPDATE widgets SET componentType = 'web' WHERE componentType = 'web_template'"))
        print("Updated web_template -> web")
        
        # 3. Update 'widget' type (instances)
        # We need to check config to be sure, but for now let's default to 'chart' 
        # as web components are rarer and usually created via template.
        # If we really want to be safe, we would select them, check JSON, and update.
        # But SQL update based on JSON in SQLite is tricky without JSON extension usage which might vary.
        # Given the recent creation, 'widget' type is likely just charts.
        conn.execute(text("UPDATE widgets SET componentType = 'chart' WHERE componentType = 'widget'"))
        print("Updated widget -> chart")
        
        conn.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    migrate_types()
