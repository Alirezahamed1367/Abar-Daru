"""
Migration: Add is_virtual column to warehouses table
و علامت‌گذاری انبار TRANSIT به عنوان انبار مجازی
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    # Add is_virtual column if not exists
    try:
        cursor.execute("ALTER TABLE warehouses ADD COLUMN is_virtual INTEGER DEFAULT 0")
        print("✅ ستون is_virtual به جدول warehouses اضافه شد")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("ℹ️  ستون is_virtual قبلاً وجود داشت")
        else:
            raise
    
    # Mark TRANSIT warehouse as virtual
    cursor.execute("UPDATE warehouses SET is_virtual = 1 WHERE code = 'TRANSIT'")
    affected = cursor.rowcount
    
    if affected > 0:
        print(f"✅ انبار TRANSIT به عنوان انبار مجازی علامت‌گذاری شد")
    else:
        print("ℹ️  انبار TRANSIT یافت نشد (در startup ایجاد خواهد شد)")
    
    conn.commit()
    
    # Show all warehouses
    cursor.execute("SELECT id, name, code, is_virtual FROM warehouses")
    warehouses = cursor.fetchall()
    print("\n📦 لیست انبارها:")
    for wh in warehouses:
        virtual_label = "🔒 مجازی" if wh[3] else "✅ فیزیکی"
        print(f"  {virtual_label} - ID: {wh[0]}, Name: {wh[1]}, Code: {wh[2]}")
    
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"✅ Migration completed successfully!")
    print(f"{'='*60}")

if __name__ == "__main__":
    migrate()
