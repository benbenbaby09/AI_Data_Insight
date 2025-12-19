
import pytest
from unittest.mock import MagicMock
from backend.services import web_component_service
from backend.schemas.base import WebComponentTemplateBase
from backend.models.orm import Widget

def test_create_web_component_with_dataset_id():
    mock_db = MagicMock()
    
    # Mock existing query to return None (new component)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    comp = WebComponentTemplateBase(
        id=0,
        name="Test Web Widget",
        description="Test Desc",
        code="<div>Hello</div>",
        datasetId=123,
        createdAt=1000
    )
    
    # Execute
    # Mock refresh to set ID
    def side_effect(arg):
        arg.id = 1
    mock_db.refresh.side_effect = side_effect
    
    result = web_component_service.create_or_update(mock_db, comp)
    
    # Verify DB add was called
    assert mock_db.add.called
    added_widget = mock_db.add.call_args[0][0]
    
    assert isinstance(added_widget, Widget)
    assert added_widget.name == "Test Web Widget"
    assert added_widget.type == "web"
    assert added_widget.datasetId == 123  # Verify datasetId is saved

def test_update_web_component_preserves_dataset_id():
    mock_db = MagicMock()
    
    existing_widget = Widget(id=1, name="Old Name", type="web", datasetId=456)
    mock_db.query.return_value.filter.return_value.first.return_value = existing_widget
    
    comp = WebComponentTemplateBase(
        id=1,
        name="New Name",
        description="New Desc",
        code="<div>New</div>",
        datasetId=789,
        createdAt=2000
    )
    
    # Execute
    web_component_service.create_or_update(mock_db, comp)
    
    # Verify update
    assert existing_widget.name == "New Name"
    assert existing_widget.datasetId == 789

