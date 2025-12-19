from sqlalchemy import Column, Integer, String, JSON, BigInteger, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.session import Base

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    config = Column(JSON)
    # Relationship: one DataSource has many Tables
    tables = relationship("TableEntry", back_populates="dataSource", cascade="all, delete-orphan")

class TableEntry(Base):
    __tablename__ = "tables"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    columns = Column(JSON)  # List[Column] as JSON
    rows = Column(JSON)     # Sample rows as JSON
    dataSourceId = Column(Integer, ForeignKey("data_sources.id"), index=True)
    dataSource = relationship("DataSource", back_populates="tables")

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    dataSourceId = Column(Integer)
    sql = Column(String)
    previewData = Column(JSON)
    createdAt = Column(BigInteger)

    widgets = relationship("Widget", primaryjoin="foreign(Widget.datasetId) == Dataset.id", back_populates="dataset")

class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), primary_key=True)
    widget_id = Column(Integer, ForeignKey("widgets.id"), primary_key=True)
    layout = Column(JSON)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="widget_associations")
    widget = relationship("Widget", back_populates="dashboard_associations")

class Dashboard(Base):
    __tablename__ = "dashboards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    widget_associations = relationship("DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan")
    
    createdAt = Column(BigInteger)
    updatedAt = Column(BigInteger, nullable=True)

    @property
    def widgets(self):
        # Helper to match previous interface if needed, or used by serializer
        return [assoc.widget for assoc in self.widget_associations]

class Widget(Base):
    __tablename__ = "widgets"
    id = Column(Integer, primary_key=True, index=True)
    datasetId = Column(Integer, nullable=True) # Renamed from tableId
    name = Column(String, nullable=True) # For Saved Components
    description = Column(String, nullable=True) # For Saved Components
    config = Column(JSON)
    
    # Unified Component Fields
    type = Column(String) # 'chart' or 'web'
    content = Column(String, nullable=True) # Web Component Code or other large text content
    
    createdAt = Column(BigInteger) # Renamed from timestamp
    updatedAt = Column(BigInteger, nullable=True)
    
    dashboard_associations = relationship("DashboardWidget", back_populates="widget", cascade="all, delete-orphan")
    dataset = relationship("Dataset", primaryjoin="foreign(Widget.datasetId) == Dataset.id", back_populates="widgets")

# Deprecated - Moved to Widget
# class WebComponentTemplate(Base):
#     __tablename__ = "web_components"
#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String)
#     description = Column(String)
#     code = Column(String)
#     createdAt = Column(BigInteger)

# Deprecated - Moved to Widget
# class ChartTemplate(Base):
#     __tablename__ = "chart_templates"
#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String)
#     description = Column(String)
#     isCustom = Column(Boolean)
#     type = Column(String)
#     icon = Column(String)
#     customSpec = Column(JSON, nullable=True)
#     chartParams = Column(JSON, nullable=True)
