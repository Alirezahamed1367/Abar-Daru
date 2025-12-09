"""
تست API برای بررسی داده‌های inventory
"""

import requests
import json

# تنظیمات
BASE_URL = "http://localhost:8000"
# اگر نیاز به احراز هویت دارید، ابتدا login کنید
username = "admin"
password = "admin"

# لاگین
login_response = requests.post(f"{BASE_URL}/api/login", params={
    "username": username,
    "password": password
})

if login_response.status_code != 200:
    print(f"❌ خطا در لاگین: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json().get("token")
print(f"✅ لاگین موفق. Token: {token[:20]}...")

# هدرهای احراز هویت
headers = {
    "Authorization": f"Bearer {token}"
}

# دریافت inventory
print("\n" + "=" * 80)
print("دریافت داده‌های Inventory از API")
print("=" * 80)

inv_response = requests.get(f"{BASE_URL}/api/inventory", headers=headers)

if inv_response.status_code != 200:
    print(f"❌ خطا در دریافت inventory: {inv_response.status_code}")
    print(inv_response.text)
    exit(1)

inventory = inv_response.json()
print(f"\n✅ تعداد کل آیتم‌های inventory: {len(inventory)}")

# پیدا کردن پیش‌بند (Drug ID: 24 از تست قبلی)
print("\n" + "=" * 80)
print("جستجوی پیش‌بند (Drug ID: 24)")
print("=" * 80)

pishband_items = [item for item in inventory if item['drug_id'] == 24]

if not pishband_items:
    print("❌ هیچ موجودی برای پیش‌بند یافت نشد!")
else:
    print(f"\n✅ {len(pishband_items)} رکورد موجودی برای پیش‌بند:")
    for item in pishband_items:
        print(f"\n  Inventory ID: {item['id']}")
        print(f"    Warehouse ID: {item['warehouse_id']}")
        print(f"    Quantity: {item['quantity']}")
        print(f"    Expire Date: {item.get('expire_date', 'None')}")

# دریافت warehouses
print("\n" + "=" * 80)
print("دریافت داده‌های Warehouses از API")
print("=" * 80)

wh_response = requests.get(f"{BASE_URL}/api/warehouses", headers=headers)

if wh_response.status_code != 200:
    print(f"❌ خطا در دریافت warehouses: {wh_response.status_code}")
    exit(1)

warehouses = wh_response.json()
print(f"\n✅ تعداد انبارها: {len(warehouses)}")

# پیدا کردن انبار مشهد
mashhad_whs = [wh for wh in warehouses if 'مشهد' in wh['name']]
print(f"\n✅ انبارهای مشهد:")
for wh in mashhad_whs:
    print(f"  - {wh['name']} (ID: {wh['id']})")

# دریافت drugs
print("\n" + "=" * 80)
print("دریافت داده‌های Drugs از API")
print("=" * 80)

drugs_response = requests.get(f"{BASE_URL}/api/drugs", headers=headers)

if drugs_response.status_code != 200:
    print(f"❌ خطا در دریافت drugs: {drugs_response.status_code}")
    exit(1)

drugs = drugs_response.json()

# پیدا کردن پیش‌بند
pishband_drug = [d for d in drugs if 'پیش' in d['name'] and 'بند' in d['name']]
if pishband_drug:
    print(f"\n✅ دارو پیدا شد:")
    for drug in pishband_drug:
        print(f"  Drug ID: {drug['id']}")
        print(f"  Name: {drug['name']}")
        print(f"  Has Expiry Date: {drug.get('has_expiry_date', 'N/A')}")

print("\n" + "=" * 80)
print("پایان تست API")
print("=" * 80)
