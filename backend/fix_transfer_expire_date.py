"""
Fix transfers table to allow NULL expire_date
"""
import sqlite3
import os

# Find database
possible_paths = [
    "D:/Hamed/Project/Anbar-Daru/pharmacy.db",
    "../pharmacy.db",
    "pharmacy.db"
]

db_path = None
for path in possible_paths:
    if os.path.exists(path):
        db_path = path
        break

if not db_path:
    print("❌ Database not found!")
    exit(1)

print(f"📁 Database: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n🔧 Fixing transfers table...")

# SQLite doesn't support ALTER COLUMN directly
# We need to recreate the table

try:
    # Step 1: Create new table with correct schema
    cursor.execute("""
        CREATE TABLE transfers_new (
            id INTEGER PRIMARY KEY,
            source_warehouse_id INTEGER,
            destination_warehouse_id INTEGER,
            consumer_id INTEGER,
            transfer_type TEXT DEFAULT 'warehouse',
            drug_id INTEGER,
            expire_date TEXT,  -- Now nullable
            transfer_date TEXT,
            quantity_sent INTEGER NOT NULL,
            quantity_received INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            confirmed_at TEXT,
            FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (consumer_id) REFERENCES consumers(id),
            FOREIGN KEY (drug_id) REFERENCES drugs(id)
        )
    """)
    print("✅ Created new transfers table")
    
    # Step 2: Copy data from old table
    cursor.execute("""
        INSERT INTO transfers_new 
        SELECT * FROM transfers
    """)
    print(f"✅ Copied {cursor.rowcount} records")
    
    # Step 3: Drop old table
    cursor.execute("DROP TABLE transfers")
    print("✅ Dropped old transfers table")
    
    # Step 4: Rename new table
    cursor.execute("ALTER TABLE transfers_new RENAME TO transfers")
    print("✅ Renamed new table to transfers")
    
    # Commit changes
    conn.commit()
    print("\n✅ Migration completed successfully!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    conn.rollback()
    raise
finally:
    conn.close()

print("\n✅ Database updated successfully!")
print("Now restart the backend server and test the transfer.")
