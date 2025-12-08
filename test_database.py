import sys
import os
from datetime import datetime

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

try:
    from backend.database import SessionLocal
    from backend.models import Drug, Inventory, SystemSettings, Warehouse
except ImportError:
    # Fallback if running from backend directory
    from database import SessionLocal
    from models import Drug, Inventory, SystemSettings, Warehouse

db = SessionLocal()

print("=" * 80)
print("🔍 تحلیل کامل دیتابیس - تاریخ انقضا")
print("=" * 80)

# 1. بررسی تنظیمات
print("\n📌 1. تنظیمات سیستم:")
print("-" * 80)
exp_setting = db.query(SystemSettings).filter(SystemSettings.key == 'exp_warning_days').first()
if exp_setting:
    print(f"   exp_warning_days = {exp_setting.value} روز")
else:
    print("   ⚠️  exp_warning_days تنظیم نشده (پیش‌فرض: 90 روز)")

# 2. بررسی داروها
print("\n📌 2. آمار داروها:")
print("-" * 80)
total_drugs = db.query(Drug).count()
drugs_with_expiry = db.query(Drug).filter(Drug.has_expiry_date == True).count()
drugs_without_expiry = db.query(Drug).filter(Drug.has_expiry_date == False).count()

print(f"   تعداد کل داروها: {total_drugs}")
print(f"   داروهای با تاریخ انقضا: {drugs_with_expiry}")
print(f"   داروهای بدون تاریخ انقضا: {drugs_without_expiry}")

# 3. بررسی موجودی‌ها
print("\n📌 3. آمار موجودی‌ها:")
print("-" * 80)
total_inventory = db.query(Inventory).count()
inventory_with_date = db.query(Inventory).filter(Inventory.expire_date.isnot(None)).count()
inventory_without_date = db.query(Inventory).filter(Inventory.expire_date.is_(None)).count()

print(f"   تعداد کل موجودی‌ها: {total_inventory}")
print(f"   موجودی با تاریخ انقضا: {inventory_with_date}")
print(f"   موجودی بدون تاریخ انقضا: {inventory_without_date}")

# 4. نمونه موجودی‌ها با تاریخ
print("\n📌 4. نمونه موجودی‌های دارای تاریخ انقضا:")
print("-" * 80)
print(f"{'ID':<5} {'دارو':<30} {'انبار':<25} {'تاریخ انقضا':<12} {'موجودی':<8}")
print("-" * 80)

inventories = db.query(Inventory).filter(
    Inventory.expire_date.isnot(None),
    Inventory.quantity > 0
).order_by(Inventory.expire_date).limit(20).all()

for inv in inventories:
    drug_name = inv.drug.name if inv.drug else 'نامشخص'
    warehouse_name = inv.warehouse.name if inv.warehouse else 'نامشخص'
    print(f"{inv.id:<5} {drug_name[:28]:<30} {warehouse_name[:23]:<25} {inv.expire_date:<12} {inv.quantity:<8}")

# 5. تحلیل تاریخ‌های انقضا
print("\n📌 5. توزیع تاریخ‌های انقضا:")
print("-" * 80)

from collections import defaultdict
year_count = defaultdict(int)
all_dates = []

for inv in db.query(Inventory).filter(Inventory.expire_date.isnot(None)).all():
    if inv.expire_date:
        all_dates.append(inv.expire_date)
        year = inv.expire_date.split('-')[0] if '-' in inv.expire_date else 'نامشخص'
        year_count[year] += 1

print(f"   تعداد کل تاریخ‌های ثبت شده: {len(all_dates)}")
print("\n   توزیع بر اساس سال:")
for year in sorted(year_count.keys()):
    print(f"      {year}: {year_count[year]} مورد")

# 6. تاریخ‌های منحصر به فرد
print("\n📌 6. تاریخ‌های منحصر به فرد (مرتب شده):")
print("-" * 80)
unique_dates = sorted(set(all_dates))
print(f"   تعداد: {len(unique_dates)} تاریخ منحصر به فرد")
print("\n   لیست (20 تاریخ اول و آخر):")

if len(unique_dates) <= 40:
    for date in unique_dates:
        print(f"      - {date}")
else:
    print("   اولین 20 تاریخ:")
    for date in unique_dates[:20]:
        print(f"      - {date}")
    print(f"\n   ... ({len(unique_dates) - 40} تاریخ دیگر) ...\n")
    print("   آخرین 20 تاریخ:")
    for date in unique_dates[-20:]:
        print(f"      - {date}")

# 7. بررسی فرمت تاریخ‌ها
print("\n📌 7. بررسی فرمت تاریخ‌ها:")
print("-" * 80)
valid_format = 0
invalid_format = []

for date in unique_dates:
    if date and '-' in date:
        parts = date.split('-')
        if len(parts) == 2 and len(parts[0]) == 4 and len(parts[1]) == 2:
            valid_format += 1
        else:
            invalid_format.append(date)
    else:
        invalid_format.append(date)

print(f"   فرمت صحیح (YYYY-MM): {valid_format}")
if invalid_format:
    print(f"   ⚠️  فرمت نامعتبر: {len(invalid_format)} مورد")
    for date in invalid_format[:10]:
        print(f"      - {date}")
else:
    print("   ✅ همه تاریخ‌ها فرمت صحیح دارند")

# 8. تحلیل وضعیت انقضا (با محاسبه JavaScript)
print("\n📌 8. تحلیل وضعیت انقضا (محاسبه مانند Frontend):")
print("-" * 80)

def parse_expire_date(date_str):
    """تبدیل YYYY-MM به آخرین روز ماه"""
    if not date_str or '-' not in date_str:
        return None
    try:
        year, month = map(int, date_str.split('-'))
        # آخرین روز ماه
        from datetime import date
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, last_day)
    except:
        return None

def get_days_until_expiration(date_str):
    """محاسبه روزهای باقی‌مانده"""
    expire_date = parse_expire_date(date_str)
    if not expire_date:
        return None
    
    today = datetime.now().date()
    diff = (expire_date - today).days
    return diff

# تحلیل
expired = []
critical = []  # کمتر از 30 روز
warning = []   # 30-90 روز
safe = []      # بیش از 90 روز

for date in unique_dates:
    days = get_days_until_expiration(date)
    if days is not None:
        if days < 0:
            expired.append((date, days))
        elif days < 30:
            critical.append((date, days))
        elif days < 90:
            warning.append((date, days))
        else:
            safe.append((date, days))

print(f"   🔴 منقضی شده (days < 0): {len(expired)} تاریخ")
if expired[:5]:
    for date, days in expired[:5]:
        print(f"      {date}: {days} روز")

print(f"\n   🟠 بحرانی (0-30 روز): {len(critical)} تاریخ")
if critical[:5]:
    for date, days in critical[:5]:
        print(f"      {date}: {days} روز")

print(f"\n   🟡 هشدار (30-90 روز): {len(warning)} تاریخ")
if warning[:5]:
    for date, days in warning[:5]:
        print(f"      {date}: {days} روز")

print(f"\n   🟢 سالم (>90 روز): {len(safe)} تاریخ")
if safe[:5]:
    for date, days in safe[:5]:
        print(f"      {date}: {days} روز")

# 9. مقایسه Backend vs Frontend
print("\n📌 9. مقایسه روش Backend (/expiring-drugs):")
print("-" * 80)

warning_days = int(exp_setting.value) if exp_setting else 90
cutoff_date = datetime.now()
from datetime import timedelta
cutoff_date = cutoff_date + timedelta(days=warning_days)
cutoff_str = cutoff_date.strftime('%Y-%m')

print(f"   امروز: {datetime.now().strftime('%Y-%m-%d')}")
print(f"   حد هشدار: {warning_days} روز")
print(f"   تاریخ برش (cutoff): {cutoff_str}")

backend_expiring = db.query(Inventory).join(Drug).filter(
    Drug.has_expiry_date == True,
    Inventory.expire_date.isnot(None),
    Inventory.expire_date <= cutoff_str,
    Inventory.quantity > 0
).count()

print(f"\n   ⚠️  تعداد موجودی‌های 'در معرض خطر' (روش Backend): {backend_expiring}")
print(f"   📊 تعداد تاریخ‌های منقضی + بحرانی + هشدار (روش Frontend): {len(expired) + len(critical) + len(warning)}")

print("\n" + "=" * 80)
print("✅ تحلیل کامل شد!")
print("=" * 80)

db.close()
