import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    try:
        # Add consumer_id column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN consumer_id INTEGER REFERENCES consumers(id)")
        print("Added consumer_id column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"Column consumer_id might already exist: {e}")

    try:
        # Add transfer_type column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN transfer_type VARCHAR DEFAULT 'warehouse'")
        print("Added transfer_type column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"Column transfer_type might already exist: {e}")

    try:
        # Add entry_date column to inventory table
        cursor.execute("ALTER TABLE inventory ADD COLUMN entry_date VARCHAR")
        print("Added entry_date column to inventory table")
    except sqlite3.OperationalError as e:
        print(f"Column entry_date might already exist: {e}")

    try:
        # Add transfer_date column to transfers table
        cursor.execute("ALTER TABLE transfers ADD COLUMN transfer_date VARCHAR")
        print("Added transfer_date column to transfers table")
    except sqlite3.OperationalError as e:
        print(f"Column transfer_date might already exist: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
