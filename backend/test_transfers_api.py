"""
Test transfers API and check what data is returned
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_get_transfers():
    """Get all transfers"""
    print("="*60)
    print("Testing GET /api/transfer/all")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/transfer/all")
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Got {len(data)} transfers")
            
            if len(data) > 0:
                print("\n📊 Transfer Details:")
                print("-" * 60)
                for i, transfer in enumerate(data, 1):
                    print(f"\n{i}. Transfer ID: {transfer['id']}")
                    print(f"   Status: {transfer['status']}")
                    print(f"   Type: {transfer['transfer_type']}")
                    print(f"   Drug: {transfer.get('drug', {}).get('name', 'N/A')}")
                    print(f"   From: {transfer.get('source_warehouse', {}).get('name', 'N/A')}")
                    
                    if transfer['transfer_type'] == 'warehouse':
                        print(f"   To: {transfer.get('destination_warehouse', {}).get('name', 'N/A')}")
                    elif transfer['transfer_type'] == 'consumer':
                        print(f"   Consumer: {transfer.get('consumer', {}).get('name', 'N/A')}")
                    elif transfer['transfer_type'] == 'disposal':
                        print(f"   To: معدوم‌سازی")
                    
                    print(f"   Expire Date: {transfer.get('expire_date', 'N/A')}")
                    print(f"   Quantity Sent: {transfer['quantity_sent']}")
                    print(f"   Quantity Received: {transfer['quantity_received']}")
                    print(f"   Created: {transfer.get('created_at', 'N/A')}")
                    print(f"   Confirmed: {transfer.get('confirmed_at', 'N/A')}")
                
                # Show summary
                print("\n" + "="*60)
                print("📊 SUMMARY:")
                print("="*60)
                statuses = {}
                types = {}
                for t in data:
                    status = t['status']
                    ttype = t['transfer_type']
                    statuses[status] = statuses.get(status, 0) + 1
                    types[ttype] = types.get(ttype, 0) + 1
                
                print("\nBy Status:")
                for status, count in statuses.items():
                    print(f"   {status}: {count}")
                
                print("\nBy Type:")
                for ttype, count in types.items():
                    print(f"   {ttype}: {count}")
                
            else:
                print("\n⚠️ No transfers found in database!")
                print("   Possible reasons:")
                print("   1. No transfers have been created yet")
                print("   2. Transfers table is empty")
                print("   3. Database migration might have cleared data")
            
            return True
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Transfers API")
    test_get_transfers()
