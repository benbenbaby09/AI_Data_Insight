from sqlalchemy.orm import Session
from backend.models.orm import Dataset, DataSource
from backend.schemas import DatasetBase
from backend.schemas.base import ExecuteSqlRequest
import backend.services.datasource_service as datasource_service

def get_all(db: Session) -> list[Dataset]:
    return db.query(Dataset).all()

def get_by_id(db: Session, id: int) -> Dataset | None:
    return db.query(Dataset).filter(Dataset.id == id).first()

def create(db: Session, dataset: DatasetBase) -> Dataset:
    db_dataset = Dataset(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        dataSourceId=dataset.dataSourceId,
        sql=dataset.sql,
        previewData=dataset.previewData.dict() if dataset.previewData else None,
        createdAt=dataset.createdAt
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

def update(db: Session, id: int, dataset: DatasetBase) -> Dataset | None:
    db_dataset = get_by_id(db, id)
    if not db_dataset:
        return None
    
    db_dataset.name = dataset.name
    db_dataset.description = dataset.description
    db_dataset.dataSourceId = dataset.dataSourceId
    db_dataset.sql = dataset.sql
    db_dataset.previewData = dataset.previewData.dict() if dataset.previewData else None
    # createdAt usually doesn't change on update, but if we had updatedAt we would set it here
    
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

def delete(db: Session, id: int) -> bool:
    db_dataset = get_by_id(db, id)
    if not db_dataset:
        return False

    if db_dataset.widgets:
        raise ValueError(f"无法删除数据集 \"{db_dataset.name}\"，因为它正在被组件使用。")

    db.delete(db_dataset)
    db.commit()
    return True

def execute_query(db: Session, dataset_id: int, limit: int = 100) -> dict:
    dataset = get_by_id(db, dataset_id)
    if not dataset:
        raise ValueError(f"Dataset with id {dataset_id} not found")
    
    data_source = db.query(DataSource).filter(DataSource.id == dataset.dataSourceId).first()
    if not data_source:
        raise ValueError(f"DataSource with id {dataset.dataSourceId} not found")
        
    config = data_source.config
    
    # Ensure required fields are strings
    request = ExecuteSqlRequest(
        type=str(config.get('type')),
        host=str(config.get('host')),
        port=str(config.get('port')),
        username=str(config.get('username')),
        password=str(config.get('password', '')),
        serviceName=config.get('serviceName'),
        database=config.get('database'),
        sql=dataset.sql,
        limit=limit
    )
    
    return datasource_service.execute_sql(request)
