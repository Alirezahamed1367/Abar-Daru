"""
Visual demonstration: Change setting and see color changes
"""
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def login():
    response = requests.post(f"{BASE_URL}/api/login?username=admin&password=admin")
    if response.status_code == 200:
        return response.json()['token']
    return None

def demonstrate_color_changes(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get current setting
    response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
    current_setting = int(response.json().get('exp_warning_days', 90))
    
    print("="*70)
    print("VISUAL DEMONSTRATION: How exp_warning_days Affects Colors")
    print("="*70)
    
    # Get inventory with expiry dates
    inv_response = requests.get(f"{BASE_URL}/api/inventory", headers=headers)
    inventory = inv_response.json()
    
    # Find items that will change color
    def get_days(date_str):
        if not date_str or '-' not in date_str:
            return None
        parts = date_str.split('-')
        if len(parts) != 2:
            return None
        year, month = int(parts[0]), int(parts[1])
        if month == 12:
            expire = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            expire = datetime(year, month + 1, 1) - timedelta(days=1)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return (expire - today).days
    
    # Find interesting items (between 30-120 days)
    interesting = []
    for item in inventory:
        if item.get('expire_date'):
            days = get_days(item['expire_date'])
            if days and 30 < days < 200:
                interesting.append({
                    'name': item.get('drug_name', 'Unknown')[:35],
                    'warehouse': item.get('warehouse_name', 'Unknown')[:20],
                    'expire': item['expire_date'],
                    'days': days
                })
    
    interesting.sort(key=lambda x: x['days'])
    
    print(f"\nCurrent setting: {current_setting} days")
    print(f"Found {len(interesting)} items expiring in 30-200 days\n")
    
    if len(interesting) > 0:
        print("📊 Color changes when you modify exp_warning_days:\n")
        print(f"{'Drug':<37} {'Warehouse':<22} {'Expire':<10} {'Days':<6} {'@30':<8} {'@60':<8} {'@90':<8} {'@120':<8}")
        print("-" * 115)
        
        for item in interesting[:10]:
            days = item['days']
            
            # Color at different thresholds
            def color_at(threshold):
                if days <= 0:
                    return '🔴 RED'
                elif days < threshold:
                    return '🟡 YELLOW'
                else:
                    return '🟢 GREEN'
            
            print(f"{item['name']:<37} {item['warehouse']:<22} {item['expire']:<10} {days:<6} "
                  f"{color_at(30):<8} {color_at(60):<8} {color_at(90):<8} {color_at(120):<8}")
    
    print("\n" + "="*70)
    print("INTERPRETATION:")
    print("="*70)
    print("• If exp_warning_days = 30: Items with <30 days = YELLOW")
    print("• If exp_warning_days = 60: Items with <60 days = YELLOW")
    print("• If exp_warning_days = 90: Items with <90 days = YELLOW (default)")
    print("• If exp_warning_days = 120: Items with <120 days = YELLOW")
    print("\n✅ Changing this setting in 'تنظیمات سیستم' WILL change colors!")
    print("="*70)
    
    return current_setting

if __name__ == "__main__":
    token = login()
    if token:
        demonstrate_color_changes(token)
