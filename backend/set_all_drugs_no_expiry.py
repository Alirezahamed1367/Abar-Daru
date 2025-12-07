"""
Script to set all existing drugs as non-expiry items (has_expiry_date = False)
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
        
        # Update all drugs to has_expiry_date = False (0 in SQLite)
        cursor.execute("UPDATE drugs SET has_expiry_date = 0")
        updated_count = cursor.rowcount
        
        conn.commit()
        
        print(f"✅ Successfully updated {updated_count} drugs to 'بدون تاریخ انقضا' (has_expiry_date = False)")
        print("\nUpdated drugs:")
        for drug_id, drug_name in drugs:
            print(f"  - {drug_name} (ID: {drug_id})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
