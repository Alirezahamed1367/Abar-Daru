"""
Test backup functionality
"""
import requests
import json
import os

BASE_URL = "http://localhost:8000"

def login():
    """Login as admin"""
    response = requests.post(
        f"{BASE_URL}/api/users/login",
        data={"username": "admin", "password": "admin"}
    )
    if response.status_code == 200:
        token = response.json()['access_token']
        print(f"✅ Login successful")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def test_backup(token):
    """Test backup creation"""
    print("\n" + "="*60)
    print("TEST: Creating database backup")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/backup-db",
            headers=headers
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Backup created")
            print(f"   Backup file: {data.get('backup', 'N/A')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            
            # Check if file exists
            backup_dir = "D:/Hamed/Project/Anbar-Daru/db_backup"
            backup_file = os.path.join(backup_dir, data.get('backup', ''))
            if os.path.exists(backup_file):
                size = os.path.getsize(backup_file) / 1024  # KB
                print(f"   File size: {size:.2f} KB")
                print(f"   ✅ Backup file verified")
            else:
                print(f"   ⚠️ Backup file not found at: {backup_file}")
            
            return True
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def list_backups():
    """List all backup files"""
    print("\n" + "="*60)
    print("Existing backups:")
    print("="*60)
    
    backup_dir = "D:/Hamed/Project/Anbar-Daru/db_backup"
    if os.path.exists(backup_dir):
        files = [f for f in os.listdir(backup_dir) if f.endswith('.db')]
        if files:
            for f in sorted(files, reverse=True):
                full_path = os.path.join(backup_dir, f)
                size = os.path.getsize(full_path) / 1024
                print(f"   📁 {f} ({size:.2f} KB)")
        else:
            print("   (No backup files found)")
    else:
        print(f"   ⚠️ Backup directory not found: {backup_dir}")

if __name__ == "__main__":
    print("🚀 Testing Backup Functionality")
    print("="*60)
    
    # Show existing backups
    list_backups()
    
    # Login
    token = login()
    if not token:
        print("❌ Cannot proceed without token")
        exit(1)
    
    # Test backup creation
    success = test_backup(token)
    
    # Show backups again
    list_backups()
    
    print("\n" + "="*60)
    print(f"Result: {'✅ PASS' if success else '❌ FAIL'}")
    print("="*60)
