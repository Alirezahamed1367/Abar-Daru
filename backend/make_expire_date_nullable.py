"""
Migration script to make expire_date nullable in inventory table
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    try:
        print("Making expire_date nullable in inventory table...")
        
        # SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
        # But first, let's check current data
        cursor.execute("SELECT COUNT(*) FROM inventory")
        count = cursor.fetchone()[0]
        print(f"Found {count} inventory records")
        
        # Get table schema
        cursor.execute("PRAGMA table_info(inventory)")
        columns = cursor.fetchall()
        print("\nCurrent schema:")
        for col in columns:
            print(f"  {col[1]}: {col[2]} (nullable: {col[3] == 0})")
        
        # In SQLite, we need to:
        # 1. Create new table with nullable expire_date
        # 2. Copy data
        # 3. Drop old table
        # 4. Rename new table
        
        print("\nStep 1: Creating temporary table...")
        cursor.execute("""
            CREATE TABLE inventory_new (
                id INTEGER PRIMARY KEY,
                warehouse_id INTEGER,
                drug_id INTEGER,
                supplier_id INTEGER,
                expire_date TEXT,  -- Now nullable (no NOT NULL constraint)
                entry_date TEXT,
                quantity INTEGER DEFAULT 0,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
                FOREIGN KEY (drug_id) REFERENCES drugs(id),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                UNIQUE (warehouse_id, drug_id, expire_date)
            )
        """)
        
        print("Step 2: Copying data from old table...")
        cursor.execute("""
            INSERT INTO inventory_new 
            SELECT id, warehouse_id, drug_id, supplier_id, expire_date, entry_date, quantity
            FROM inventory
        """)
        copied = cursor.rowcount
        print(f"Copied {copied} records")
        
        print("Step 3: Dropping old table...")
        cursor.execute("DROP TABLE inventory")
        
        print("Step 4: Renaming new table...")
        cursor.execute("ALTER TABLE inventory_new RENAME TO inventory")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("   expire_date is now nullable for drugs without expiry dates")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
