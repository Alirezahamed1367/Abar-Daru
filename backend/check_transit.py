import sqlite3

conn = sqlite3.connect('pharmacy.db')
cursor = conn.cursor()

# Check TRANSIT warehouse
cursor.execute("SELECT id, name, code FROM warehouses WHERE code='TRANSIT'")
result = cursor.fetchone()

if result:
    print(f"✅ انبار TRANSIT موجود است: ID={result[0]}, Name={result[1]}, Code={result[2]}")
else:
    print("❌ انبار TRANSIT یافت نشد!")
    print("\nایجاد انبار TRANSIT...")
    cursor.execute("""
        INSERT INTO warehouses (name, code, address, manager)
        VALUES ('کالای در راه', 'TRANSIT', 'انبار مجازی', 'سیستم')
    """)
    conn.commit()
    print("✅ انبار TRANSIT ایجاد شد")

# Show all warehouses
cursor.execute("SELECT id, name, code FROM warehouses")
warehouses = cursor.fetchall()
print("\n📦 لیست همه انبارها:")
for wh in warehouses:
    print(f"  - ID: {wh[0]}, Name: {wh[1]}, Code: {wh[2]}")

conn.close()
