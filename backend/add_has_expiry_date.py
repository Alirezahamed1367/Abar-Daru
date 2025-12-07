"""
Migration script to add has_expiry_date column to drugs table
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(drugs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'has_expiry_date' not in columns:
            print("Adding has_expiry_date column to drugs table...")
            cursor.execute("ALTER TABLE drugs ADD COLUMN has_expiry_date INTEGER DEFAULT 1")
            conn.commit()
            print("✅ Column added successfully!")
        else:
            print("⚠️ Column has_expiry_date already exists")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
