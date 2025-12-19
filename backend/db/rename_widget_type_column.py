
import logging
from sqlalchemy import text
from backend.db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_column_name():
    with engine.connect() as conn:
        logger.info("Starting migration of widget column 'componentType' to 'type'...")
        
        try:
            # Try standard RENAME COLUMN (SQLite 3.25+)
            conn.execute(text("ALTER TABLE widgets RENAME COLUMN componentType TO type"))
            logger.info("Successfully renamed column 'componentType' to 'type'.")
        except Exception as e:
            logger.warning(f"Direct rename failed (likely older SQLite): {e}")
            logger.info("Attempting fallback: Add 'type', copy data, (ignoring drop for safety)...")
            
            try:
                # Fallback: Add column, copy, null old
                conn.execute(text("ALTER TABLE widgets ADD COLUMN type VARCHAR"))
                conn.execute(text("UPDATE widgets SET type = componentType"))
                # SQLite doesn't easily support dropping columns in older versions without table recreation.
                # We will leave componentType there but ignore it in ORM.
                logger.info("Fallback migration completed: 'type' column added and populated.")
            except Exception as e2:
                logger.error(f"Fallback migration failed: {e2}")
                return

        conn.commit()
        logger.info("Migration completed successfully.")

if __name__ == "__main__":
    migrate_column_name()
