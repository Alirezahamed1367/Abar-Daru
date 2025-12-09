import sqlite3

# Connect to database
conn = sqlite3.connect('pharmacy.db')
cursor = conn.cursor()

# Get all warehouses
print("=== WAREHOUSES ===")
cursor.execute("SELECT id, name, code FROM warehouses")
warehouses = cursor.fetchall()
for wh in warehouses:
    print(f"ID: {wh[0]}, Name: {wh[1]}, Code: {wh[2]}")

print("\n=== DRUGS ===")
cursor.execute("SELECT id, name FROM drugs WHERE name LIKE '%پیش%' OR name LIKE '%بند%'")
drugs = cursor.fetchall()
for drug in drugs:
    print(f"ID: {drug[0]}, Name: {drug[1]}")

if drugs:
    drug_id = drugs[0][0]
    print(f"\n=== INVENTORY for Drug ID {drug_id} ===")
    cursor.execute("""
        SELECT 
            i.id,
            i.warehouse_id,
            w.name as warehouse_name,
            i.drug_id,
            d.name as drug_name,
            i.expire_date,
            i.quantity
        FROM inventory i
        JOIN warehouses w ON i.warehouse_id = w.id
        JOIN drugs d ON i.drug_id = d.id
        WHERE i.drug_id = ?
        ORDER BY i.warehouse_id, i.expire_date
    """, (drug_id,))
    
    inventory = cursor.fetchall()
    for inv in inventory:
        print(f"Inv ID: {inv[0]}, Warehouse: {inv[2]} (ID:{inv[1]}), Drug: {inv[4]}, Expire: {inv[5]}, Quantity: {inv[6]}")

conn.close()
