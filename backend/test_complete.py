import requests

# Test 1: Login
print("=== Test 1: Login ===")
response = requests.post("http://127.0.0.1:8000/login?username=superadmin&password=A25893Aa")
print(response.json())

# Test 2: Add Warehouse
print("\n=== Test 2: Add Warehouses ===")
wh1 = requests.post("http://127.0.0.1:8000/warehouses", json={"name": "انبار مرکزی", "code": "W001", "address": "تهران", "manager": "احمد"})
print(f"Status: {wh1.status_code}, Response: {wh1.text}")
if wh1.status_code == 200:
    print(wh1.json())

wh2 = requests.post("http://127.0.0.1:8000/warehouses", json={"name": "انبار فرعی", "code": "W002", "address": "شیراز", "manager": "حسین"})
print(wh2.json())

# Test 3: Add Supplier
print("\n=== Test 3: Add Supplier ===")
sup = requests.post("http://127.0.0.1:8000/suppliers", json={"name": "شرکت دارویی A", "phone": "09123456789", "address": "تهران"})
print(sup.json())

# Test 4: Add Drug
print("\n=== Test 4: Add Drug ===")
drug = requests.post("http://127.0.0.1:8000/drugs", json={"name": "قرص سرماخوردگی", "dose": "500mg", "package_type": "بسته 20 عددی", "description": "برای سرماخوردگی"})
print(drug.json())

# Test 5: Add Inventory (Receipt)
print("\n=== Test 5: Add Inventory ===")
inv1 = requests.post("http://127.0.0.1:8000/inventory", json={"warehouse_id": 1, "drug_id": 1, "supplier_id": 1, "expire_date": "2026/08", "quantity": 100})
print(inv1.json())

inv2 = requests.post("http://127.0.0.1:8000/inventory", json={"warehouse_id": 1, "drug_id": 1, "supplier_id": 1, "expire_date": "2027/05", "quantity": 50})
print(inv2.json())

# Test 6: Create Transfer (Havaleh)
print("\n=== Test 6: Create Transfer ===")
transfer = requests.post("http://127.0.0.1:8000/transfer/create?source_warehouse_id=1&destination_warehouse_id=2&drug_id=1&expire_date=2026/08&quantity=30")
print(transfer.json())

# Test 7: Get Pending Transfers
print("\n=== Test 7: Get Pending Transfers ===")
pending = requests.get("http://127.0.0.1:8000/transfer/pending")
print(pending.json())

# Test 8: Confirm Transfer
print("\n=== Test 8: Confirm Transfer ===")
confirm = requests.post("http://127.0.0.1:8000/transfer/confirm?transfer_id=1&quantity_received=30")
print(confirm.json())

# Test 9: Get All Transfers
print("\n=== Test 9: Get All Transfers ===")
all_transfers = requests.get("http://127.0.0.1:8000/transfer/all")
print(all_transfers.json())

# Test 10: Get Inventory
print("\n=== Test 10: Get Inventory ===")
inventory = requests.get("http://127.0.0.1:8000/inventory")
for inv in inventory.json():
    print(f"انبار: {inv['warehouse']['name']}, دارو: {inv['drug']['name']}, تاریخ انقضا: {inv['expire_date']}, تعداد: {inv['quantity']}")

print("\n✅ All tests completed!")
