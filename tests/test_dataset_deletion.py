
import sys
import os
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models.orm import Base, Dataset, Widget, Dashboard
from backend.services import dataset_service

class TestDatasetDeletion(unittest.TestCase):
    def setUp(self):
        # Use an in-memory SQLite database for testing
        self.engine = create_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()

    def test_delete_dataset_with_widget(self):
        # 1. Create a Dataset
        dataset = Dataset(name="Test Dataset", sql="SELECT * FROM test", createdAt=1000)
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        
        # 2. Create a Dashboard
        dashboard = Dashboard(name="Test Dashboard", createdAt=1000, widgets=[])
        self.db.add(dashboard)
        self.db.commit()
        self.db.refresh(dashboard)

        # 3. Create a Widget linked to the Dataset
        # Note: In the new schema, we use datasetId. 
        # But we must ensure the relationship works.
        widget = Widget(
            dashboardId=dashboard.id,
            datasetId=dataset.id,
            config={"title": "Test Widget"},
            layout={"colSpan": 6, "height": 300},
            timestamp=1000
        )
        self.db.add(widget)
        self.db.commit()
        
        # Verify relationship
        self.db.refresh(dataset)
        print(f"Dataset widgets: {dataset.widgets}")
        self.assertTrue(len(dataset.widgets) > 0, "Dataset should have linked widgets")

        # 4. Attempt to delete the Dataset
        try:
            dataset_service.delete(self.db, dataset.id)
            self.fail("Should have raised ValueError due to existing widget usage")
        except ValueError as e:
            print(f"Caught expected error: {e}")
            self.assertIn("无法删除数据集", str(e))
            self.assertIn("Test Dataset", str(e))
            self.assertIn("Test Dashboard", str(e))
            self.assertIn("Test Widget", str(e))

        # 5. Delete the widget (simulating user removing component)
        self.db.delete(widget)
        self.db.commit()
        
        # Refresh dataset to update relationship
        self.db.refresh(dataset)
        print(f"Dataset widgets after widget deletion: {dataset.widgets}")
        self.assertEqual(len(dataset.widgets), 0)

        # 6. Attempt to delete the Dataset again
        result = dataset_service.delete(self.db, dataset.id)
        self.assertTrue(result, "Should successfully delete dataset after widget is removed")
        
        # Verify it's gone
        deleted_ds = self.db.query(Dataset).filter(Dataset.id == dataset.id).first()
        self.assertIsNone(deleted_ds)

if __name__ == '__main__':
    unittest.main()
