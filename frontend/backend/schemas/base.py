from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Union

class Column(BaseModel):
    name: str
    type: str
    alias: Optional[str] = None
    description: Optional[str] = None

class TableData(BaseModel):
    id: int
    name: str
    columns: List[Column]
    rows: Optional[List[Dict[str, Any]]] = []
    description: Optional[str] = None
    dataSourceId: Optional[int] = None

class DatabaseConfig(BaseModel):
    type: str
    name: str
    host: str
    port: str
    serviceName: Optional[str] = None
    database: Optional[str] = None
    username: str
    password: Optional[str] = None

class TestConnectionRequest(BaseModel):
    type: str
    host: str
    port: str
    username: str
    password: Optional[str] = ""
    serviceName: Optional[str] = None
    database: Optional[str] = None

class ConnectionTestResult(BaseModel):
    success: bool
    message: str


class DataSourceBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    config: DatabaseConfig
    tables: List[TableData]

class DataSource(DataSourceBase):
    class Config:
        from_attributes = True

class PreviewTableRequest(BaseModel):
    type: str
    host: str
    port: str
    username: str
    password: Optional[str] = ""
    serviceName: Optional[str] = None
    database: Optional[str] = None
    tableName: str
    limit: Optional[int] = 20

class ExecuteSqlRequest(BaseModel):
    type: str
    host: str
    port: str
    username: str
    password: Optional[str] = ""
    serviceName: Optional[str] = None
    database: Optional[str] = None
    sql: str
    limit: Optional[int] = 100

class DatasetBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    dataSourceId: int
    sql: str
    previewData: Optional[TableData] = None
    createdAt: int

class Dataset(DatasetBase):
    class Config:
        from_attributes = True

class CustomChartSeries(BaseModel):
    type: str
    dataKeyIndex: int
    color: Optional[str] = None
    name: Optional[str] = None
    stackId: Optional[str] = None
    yAxisId: Optional[str] = None

class CustomChartReferenceLine(BaseModel):
    y: Optional[float] = None
    label: Optional[str] = None
    color: Optional[str] = None

class CustomChartSpec(BaseModel):
    series: List[CustomChartSeries]
    referenceLines: Optional[List[CustomChartReferenceLine]] = None
    yAxisLeft: Optional[Dict[str, str]] = None
    yAxisRight: Optional[Dict[str, str]] = None

class ChartConfig(BaseModel):
    type: str
    variant: Optional[str] = None
    xAxisKey: str
    dataKeys: List[str]
    title: str
    description: str
    tableName: Optional[str] = None
    sql: Optional[str] = None
    customSpec: Optional[CustomChartSpec] = None
    chartParams: Optional[Any] = None
    webComponentCode: Optional[str] = None
    filters: Optional[List[Dict[str, str]]] = None

class WidgetLayout(BaseModel):
    colSpan: int
    height: Union[str, int]
    i: Optional[int] = 0

class DashboardWidget(BaseModel):
    id: Union[str, int]
    config: ChartConfig
    datasetId: Optional[Union[int, str]] = None # Renamed from tableId, support string for legacy frontend
    timestamp: int
    layout: WidgetLayout

class DashboardBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    widgets: List[DashboardWidget]
    createdAt: int
    updatedAt: Optional[int] = None

class Dashboard(DashboardBase):
    class Config:
        from_attributes = True

class WebComponentTemplateBase(BaseModel):
    id: int
    name: str
    description: str
    code: str
    datasetId: Optional[int] = None
    createdAt: int

class WebComponentTemplate(WebComponentTemplateBase):
    class Config:
        from_attributes = True

class ChartTemplateBase(BaseModel):
    id: int
    name: str
    description: str
    isCustom: bool
    type: str
    icon: str
    customSpec: Optional[CustomChartSpec] = None
    chartParams: Optional[Any] = None

class ChartTemplate(ChartTemplateBase):
    class Config:
        from_attributes = True

class SavedComponentCreate(BaseModel):
    name: str
    description: str
    datasetId: int
    config: ChartConfig

class SavedComponent(SavedComponentCreate):
    id: int
    createdAt: int

    class Config:
        from_attributes = True
