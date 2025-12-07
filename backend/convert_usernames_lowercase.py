"""
Script to convert all existing usernames to lowercase
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    try:
        # Get all users
        cursor.execute("SELECT id, username FROM users")
        users = cursor.fetchall()
        
        print(f"Found {len(users)} users")
        
        for user_id, username in users:
            username_lower = username.lower()
            if username != username_lower:
                print(f"  Converting: '{username}' → '{username_lower}'")
                cursor.execute("UPDATE users SET username = ? WHERE id = ?", (username_lower, user_id))
            else:
                print(f"  Already lowercase: '{username}'")
        
        conn.commit()
        print("✅ All usernames converted to lowercase!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
