from pydantic import BaseModel
from typing import Optional, Any, Dict

class WidgetBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str # 'chart' or 'web'
    content: Optional[str] = None # For web component code
    config: Optional[Dict[str, Any]] = None # For chart config or extra params
    datasetId: Optional[int] = None

class WidgetCreate(WidgetBase):
    pass

class WidgetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    datasetId: Optional[int] = None

class Widget(WidgetBase):
    id: int
    createdAt: int
    updatedAt: Optional[int] = None
    
    class Config:
        from_attributes = True
