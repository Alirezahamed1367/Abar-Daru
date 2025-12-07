"""
Verify that all drugs are set as non-expiry items
"""
import sqlite3

conn = sqlite3.connect('pharmacy.db')
cursor = conn.cursor()

# Count drugs by has_expiry_date status
cursor.execute("""
    SELECT 
        has_expiry_date,
        COUNT(*) as count
    FROM drugs
    GROUP BY has_expiry_date
""")

results = cursor.fetchall()

print("وضعیت داروها بر اساس تاریخ انقضا:")
print("-" * 50)
for has_expiry, count in results:
    status = "دارای تاریخ انقضا" if has_expiry else "بدون تاریخ انقضا"
    print(f"{status}: {count} دارو")

print("\n" + "=" * 50)

# Show sample drugs
cursor.execute("SELECT id, name, has_expiry_date FROM drugs LIMIT 5")
sample = cursor.fetchall()

print("\nنمونه داروها:")
for drug_id, name, has_expiry in sample:
    status = "✅ دارای تاریخ" if has_expiry else "⚠️ بدون تاریخ"
    print(f"  {status} - {name}")

conn.close()
