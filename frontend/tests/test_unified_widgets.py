import sys
import os
sys.path.append(os.getcwd())

from backend.db.session import SessionLocal
from backend.services import chart_template_service, web_component_service, saved_component_service
from backend.schemas import ChartTemplateBase, WebComponentTemplateBase, SavedComponentCreate, ChartConfig

def test_unified():
    db = SessionLocal()
    try:
        # 1. Test Chart Templates
        print("Testing Chart Templates...")
        charts = chart_template_service.get_all(db)
        print(f"Found {len(charts)} chart templates.")
        
        # Create a new chart template
        new_chart = ChartTemplateBase(
            id=0,
            name="Test Unified Chart",
            description="Created during test",
            isCustom=True,
            type="custom",
            icon="BarChart3",
            customSpec=None,
            chartParams={}
        )
        created_chart = chart_template_service.create(db, new_chart)
        print(f"Created chart template: {created_chart.id} - {created_chart.name}")
        
        # 2. Test Web Components
        print("\nTesting Web Components...")
        webs = web_component_service.get_all(db)
        print(f"Found {len(webs)} web components.")
        
        new_web = WebComponentTemplateBase(
            id=0,
            name="Test Unified Web",
            description="Created during test",
            code="<div>Hello</div>",
            createdAt=0
        )
        created_web = web_component_service.create_or_update(db, new_web)
        print(f"Created web component: {created_web.id} - {created_web.name}")
        
        # 3. Test Saved Components (Widgets)
        print("\nTesting Saved Components...")
        saved = saved_component_service.get_all(db)
        print(f"Found {len(saved)} saved components.")
        
        new_saved = SavedComponentCreate(
            name="Test Unified Saved",
            description="Instance",
            datasetId=1,
            config=ChartConfig(
                type="bar",
                xAxisKey="x",
                dataKeys=["y"],
                title="Test",
                description="Test Desc"
            )
        )
        created_saved = saved_component_service.create(db, new_saved)
        print(f"Created saved component: {created_saved['id']} - {created_saved['name']} (createdAt: {created_saved['createdAt']})")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_unified()
