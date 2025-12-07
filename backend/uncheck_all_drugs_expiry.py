"""
Script to remove expiry date flag from all existing drugs (reverse logic)
Now: has_expiry_date = False means NO expiry date needed (unchecked)
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    try:
        # Get all drugs
        cursor.execute("SELECT id, name FROM drugs")
        drugs = cursor.fetchall()
        
        print(f"Found {len(drugs)} drugs in database")
        
        if len(drugs) == 0:
            print("⚠️ No drugs found in database")
            conn.close()
            return
        
        # Update all drugs to has_expiry_date = NULL/0 (unchecked = no expiry needed)
        # Set to 0 (False) which means "unchecked" = "no expiry date required"
        cursor.execute("UPDATE drugs SET has_expiry_date = 0")
        updated_count = cursor.rowcount
        
        conn.commit()
        
        print(f"✅ Successfully removed expiry flag from {updated_count} drugs")
        print("\n🔹 New Logic:")
        print("  - تیک نزده (has_expiry_date = False) → بدون تاریخ انقضا")
        print("  - تیک خورده (has_expiry_date = True) → دارای تاریخ انقضا")
        print(f"\n📋 All {len(drugs)} drugs are now set as: بدون تاریخ انقضا (unchecked)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
