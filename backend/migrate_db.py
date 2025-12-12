import sqlite3
import os

def migrate():
    # Use absolute path to database in project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'pharmacy.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Running migrations on: {db_path}")
    
    try:
        # Add has_expiry_date column to drugs table
        cursor.execute("ALTER TABLE drugs ADD COLUMN has_expiry_date BOOLEAN DEFAULT 1")
        print("✅ Added has_expiry_date column to drugs table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column has_expiry_date might already exist: {e}")
    
    try:
        # Add image_data column to drugs table
        cursor.execute("ALTER TABLE drugs ADD COLUMN image_data TEXT")
        print("✅ Added image_data column to drugs table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column image_data might already exist: {e}")
    
    try:
        # Add is_virtual column to warehouses table
        cursor.execute("ALTER TABLE warehouses ADD COLUMN is_virtual BOOLEAN DEFAULT 0")
        print("✅ Added is_virtual column to warehouses table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column is_virtual might already exist: {e}")
    
    try:
        # Add consumer_id column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN consumer_id INTEGER REFERENCES consumers(id)")
        print("✅ Added consumer_id column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column consumer_id might already exist: {e}")

    try:
        # Add transfer_type column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN transfer_type VARCHAR DEFAULT 'warehouse'")
        print("✅ Added transfer_type column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column transfer_type might already exist: {e}")

    try:
        # Add entry_date column to inventory table
        cursor.execute("ALTER TABLE inventory ADD COLUMN entry_date VARCHAR")
        print("✅ Added entry_date column to inventory table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column entry_date might already exist: {e}")

    try:
        # Add transfer_date column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN transfer_date VARCHAR")
        print("✅ Added transfer_date column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column transfer_date might already exist: {e}")
    
    try:
        # Add is_disposed column to inventory table
        cursor.execute("ALTER TABLE inventory ADD COLUMN is_disposed BOOLEAN DEFAULT 0")
        print("✅ Added is_disposed column to inventory table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column is_disposed might already exist: {e}")

    # Create tools table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL,
            serial_number VARCHAR NOT NULL UNIQUE,
            manufacturer VARCHAR,
            image VARCHAR,
            image_data TEXT,
            description TEXT
        )
        """)
        print("✅ Created tools table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Table tools might already exist: {e}")

    # Create tool_inventory table
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tool_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            warehouse_id INTEGER REFERENCES warehouses(id),
            tool_id INTEGER REFERENCES tools(id),
            supplier_id INTEGER REFERENCES suppliers(id),
            entry_date VARCHAR,
            quantity INTEGER DEFAULT 1,
            is_disposed BOOLEAN DEFAULT 0,
            UNIQUE(warehouse_id, tool_id)
        )
        """)
        print("✅ Created tool_inventory table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Table tool_inventory might already exist: {e}")

    # Add tool-related columns to transfers table
    try:
        cursor.execute("ALTER TABLE transfers ADD COLUMN tool_id INTEGER REFERENCES tools(id)")
        print("✅ Added tool_id column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column tool_id might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE transfers ADD COLUMN item_type VARCHAR DEFAULT 'drug'")
        print("✅ Added item_type column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Column item_type might already exist: {e}")

    conn.commit()
    conn.close()
    print("\n🎉 Migration completed successfully!")
    print(f"Database: {db_path}")
    
if __name__ == "__main__":
    migrate()
