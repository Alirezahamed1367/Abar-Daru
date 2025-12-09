"""
Direct API test for transfer creation
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "admin"

def login():
    """Login and get token"""
    response = requests.post(
        f"{BASE_URL}/api/users/login",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful")
        print(f"Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_transfer_with_no_expiry(token):
    """Test transfer for drug without expiry date (پیش بند)"""
    print("\n" + "="*60)
    print("TEST: Transfer drug without expiry date")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Drug without expiry: پیش بند (ID: 24)
    # Source warehouse: دفتر مرکزی مشهد (ID: 3)
    # Destination: کلینیک سیار (ID: 5)
    
    params = {
        "source_warehouse_id": 3,
        "destination_warehouse_id": 5,
        "drug_id": 24,
        # expire_date is intentionally omitted (None/undefined)
        "quantity": 3,
        "transfer_type": "warehouse",
        "transfer_date": "1404/09/17"
    }
    
    print(f"\n📤 Request Parameters:")
    for key, value in params.items():
        print(f"   {key}: {value}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/transfer/create",
            params=params,
            headers=headers
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ SUCCESS! Transfer created")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return False

def test_transfer_with_expiry_null_string(token):
    """Test what happens when we send expire_date='null' as string"""
    print("\n" + "="*60)
    print("TEST: Transfer with expire_date='null' (string)")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    params = {
        "source_warehouse_id": 3,
        "destination_warehouse_id": 5,
        "drug_id": 24,
        "expire_date": "null",  # Sending as string 'null'
        "quantity": 3,
        "transfer_type": "warehouse",
        "transfer_date": "1404/09/17"
    }
    
    print(f"\n📤 Request Parameters:")
    for key, value in params.items():
        print(f"   {key}: {value}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/transfer/create",
            params=params,
            headers=headers
        )
        
        print(f"\n📥 Response Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Transfer API Test")
    print("="*60)
    
    # Login first
    token = login()
    if not token:
        print("❌ Cannot proceed without token")
        exit(1)
    
    # Test 1: No expire_date parameter (should work with our fix)
    success1 = test_transfer_with_no_expiry(token)
    
    # Test 2: expire_date='null' as string (might be what frontend is sending)
    success2 = test_transfer_with_expiry_null_string(token)
    
    print("\n" + "="*60)
    print("📊 RESULTS:")
    print("="*60)
    print(f"Test 1 (no expire_date): {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"Test 2 (expire_date='null'): {'✅ PASS' if success2 else '❌ FAIL'}")
