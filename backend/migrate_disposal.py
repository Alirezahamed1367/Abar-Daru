"""
Migration script to add disposal functionality
- Adds is_disposed column to Inventory table
- Updates Transfer.transfer_type comment for disposal support
"""

import sqlite3
import sys

def migrate_database():
    try:
        # Connect to database
        conn = sqlite3.connect('pharmacy.db')
        cursor = conn.cursor()
        
        print("=" * 80)
        print("🔧 Migration: Adding Disposal Functionality")
        print("=" * 80)
        
        # Check if is_disposed column already exists
        cursor.execute("PRAGMA table_info(inventory)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'is_disposed' not in columns:
            print("\n📝 Adding 'is_disposed' column to inventory table...")
            cursor.execute("""
                ALTER TABLE inventory 
                ADD COLUMN is_disposed BOOLEAN DEFAULT 0
            """)
            print("   ✅ Column added successfully")
        else:
            print("\n⚠️  Column 'is_disposed' already exists, skipping...")
        
        # Update all existing records to have is_disposed = False (0)
        cursor.execute("""
            UPDATE inventory 
            SET is_disposed = 0 
            WHERE is_disposed IS NULL
        """)
        updated_count = cursor.rowcount
        print(f"\n📊 Updated {updated_count} existing inventory records (is_disposed = false)")
        
        # Verify the migration
        cursor.execute("SELECT COUNT(*) FROM inventory WHERE is_disposed = 0")
        total_active = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM inventory WHERE is_disposed = 1")
        total_disposed = cursor.fetchone()[0]
        
        print(f"\n✅ Verification:")
        print(f"   Active inventory items: {total_active}")
        print(f"   Disposed inventory items: {total_disposed}")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("=" * 80)
        
    except sqlite3.Error as e:
        print(f"\n❌ Database error: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
