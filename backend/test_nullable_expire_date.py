"""
Test script to verify inventory can be added with null expire_date
"""
import sys
sys.path.append('.')

from database import SessionLocal
from models import Inventory, Drug, Warehouse, Supplier

db = SessionLocal()

try:
    # Get first drug, warehouse, and supplier for testing
    drug = db.query(Drug).first()
    warehouse = db.query(Warehouse).first()
    supplier = db.query(Supplier).first()
    
    if not drug or not warehouse or not supplier:
        print("❌ No drug, warehouse, or supplier found. Please add them first.")
        db.close()
        sys.exit(1)
    
    print(f"Testing with:")
    print(f"  Drug: {drug.name} (ID: {drug.id}, has_expiry_date: {drug.has_expiry_date})")
    print(f"  Warehouse: {warehouse.name} (ID: {warehouse.id})")
    print(f"  Supplier: {supplier.name} (ID: {supplier.id})")
    
    # Test 1: Add inventory with NULL expire_date
    print("\n📋 Test 1: Adding inventory with expire_date = None...")
    test_inv = Inventory(
        warehouse_id=warehouse.id,
        drug_id=drug.id,
        supplier_id=supplier.id,
        expire_date=None,  # NULL for drugs without expiry
        entry_date="1403/09/16",
        quantity=100
    )
    
    db.add(test_inv)
    db.commit()
    db.refresh(test_inv)
    
    print(f"✅ Successfully added inventory with ID: {test_inv.id}")
    print(f"   expire_date: {test_inv.expire_date}")
    print(f"   quantity: {test_inv.quantity}")
    
    # Clean up
    print("\n🧹 Cleaning up test data...")
    db.delete(test_inv)
    db.commit()
    print("✅ Test data removed")
    
    print("\n✅ All tests passed! Inventory can accept null expire_date")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
