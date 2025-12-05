"""
Complete API Test Script
"""
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_login():
    print("\n1️⃣ Testing Login...")
    response = requests.post(f"{BASE_URL}/login", params={
        "username": "superadmin",
        "password": "A25893Aa"
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Login successful: {response.json()}")
        return True
    else:
        print(f"   ❌ Login failed")
        return False

def test_warehouses():
    print("\n2️⃣ Testing Warehouses...")
    response = requests.get(f"{BASE_URL}/warehouses")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Found {len(data)} warehouses")
        return True
    return False

def test_drugs():
    print("\n3️⃣ Testing Drugs...")
    response = requests.get(f"{BASE_URL}/drugs")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Found {len(data)} drugs")
        return True
    return False

def test_add_inventory():
    print("\n4️⃣ Testing Add Inventory...")
    response = requests.post(f"{BASE_URL}/inventory", json={
        "warehouse_id": 1,
        "drug_id": 1,
        "supplier_id": 1,
        "expire_date": "2026-08",
        "quantity": 100
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Inventory added")
        return True
    return False

def test_create_transfer():
    print("\n5️⃣ Testing Create Transfer...")
    response = requests.post(f"{BASE_URL}/transfer/create", params={
        "source_warehouse_id": 1,
        "destination_warehouse_id": 2,
        "drug_id": 1,
        "expire_date": "2026-08",
        "quantity": 20
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Transfer created: ID {data['id']}")
        return data['id']
    return None

def test_confirm_transfer(transfer_id):
    print(f"\n6️⃣ Testing Confirm Transfer...")
    response = requests.post(f"{BASE_URL}/transfer/confirm", params={
        "transfer_id": transfer_id,
        "quantity_received": 20
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Transfer confirmed")
        return True
    return False

def run_all_tests():
    print("="*50)
    print("🚀 Starting Complete API Tests")
    print("="*50)
    
    test_login()
    test_warehouses()
    test_drugs()
    test_add_inventory()
    transfer_id = test_create_transfer()
    if transfer_id:
        test_confirm_transfer(transfer_id)
    
    print("\n" + "="*50)
    print("✅ Tests Completed!")
    print("="*50)

if __name__ == "__main__":
    run_all_tests()
