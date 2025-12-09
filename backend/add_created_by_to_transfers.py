"""
Migration: Add created_by column to transfers table
"""
import sqlite3

DB_PATH = "d:/Hamed/Project/Anbar-Daru/pharmacy.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(transfers)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'created_by' not in columns:
            print("Adding created_by column to transfers table...")
            cursor.execute("ALTER TABLE transfers ADD COLUMN created_by TEXT")
            conn.commit()
            print("✅ Column created_by added successfully")
        else:
            print("⚠️ Column created_by already exists")
        
        # Update existing transfers to have created_by = 'admin' as default
        cursor.execute("UPDATE transfers SET created_by = 'admin' WHERE created_by IS NULL")
        conn.commit()
        print(f"✅ Updated {cursor.rowcount} existing transfers with default created_by='admin'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
