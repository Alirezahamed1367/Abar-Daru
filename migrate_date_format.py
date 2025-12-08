"""
Migration: تبدیل فرمت تاریخ از YYYY/MM به YYYY-MM
"""
import sys
import os

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

try:
    from backend.database import SessionLocal
    from backend.models import Inventory, Transfer
except ImportError:
    # Fallback if running from backend directory
    from database import SessionLocal
    from models import Inventory, Transfer

db = SessionLocal()

print("=" * 80)
print("🔄 Migration: تبدیل فرمت تاریخ انقضا")
print("=" * 80)

# 1. بررسی موجودی‌ها
print("\n📌 مرحله 1: بررسی و اصلاح جدول Inventory")
print("-" * 80)

inventories = db.query(Inventory).filter(Inventory.expire_date.isnot(None)).all()
inventory_updated = 0

for inv in inventories:
    if inv.expire_date and '/' in inv.expire_date:
        old_date = inv.expire_date
        new_date = inv.expire_date.replace('/', '-')
        inv.expire_date = new_date
        inventory_updated += 1
        if inventory_updated <= 10:  # نمایش 10 مورد اول
            print(f"   ✓ ID {inv.id}: {old_date} → {new_date}")

if inventory_updated > 10:
    print(f"   ... و {inventory_updated - 10} مورد دیگر")

print(f"\n   تعداد کل رکوردهای به‌روزرسانی شده: {inventory_updated}")

# 2. بررسی حواله‌ها
print("\n📌 مرحله 2: بررسی و اصلاح جدول Transfer")
print("-" * 80)

transfers = db.query(Transfer).filter(Transfer.expire_date.isnot(None)).all()
transfer_updated = 0

for trans in transfers:
    if trans.expire_date and '/' in trans.expire_date:
        old_date = trans.expire_date
        new_date = trans.expire_date.replace('/', '-')
        trans.expire_date = new_date
        transfer_updated += 1
        if transfer_updated <= 10:  # نمایش 10 مورد اول
            print(f"   ✓ ID {trans.id}: {old_date} → {new_date}")

if transfer_updated > 10:
    print(f"   ... و {transfer_updated - 10} مورد دیگر")

print(f"\n   تعداد کل رکوردهای به‌روزرسانی شده: {transfer_updated}")

# 3. Commit تغییرات
print("\n📌 مرحله 3: ذخیره تغییرات")
print("-" * 80)

try:
    db.commit()
    print("   ✅ تمام تغییرات با موفقیت ذخیره شد")
except Exception as e:
    db.rollback()
    print(f"   ❌ خطا در ذخیره: {e}")
    sys.exit(1)

# 4. تست نهایی
print("\n📌 مرحله 4: تست نهایی")
print("-" * 80)

# بررسی اینکه آیا هنوز تاریخی با / وجود دارد
remaining_slash_inventory = db.query(Inventory).filter(
    Inventory.expire_date.like('%/%')
).count()

remaining_slash_transfer = db.query(Transfer).filter(
    Transfer.expire_date.like('%/%')
).count()

if remaining_slash_inventory == 0 and remaining_slash_transfer == 0:
    print("   ✅ همه تاریخ‌ها به فرمت صحیح (YYYY-MM) تبدیل شدند")
else:
    print(f"   ⚠️  هنوز {remaining_slash_inventory} موجودی و {remaining_slash_transfer} حواله با فرمت قدیمی باقی مانده")

# نمایش نمونه تاریخ‌های جدید
print("\n   نمونه تاریخ‌های جدید:")
sample = db.query(Inventory).filter(Inventory.expire_date.isnot(None)).limit(5).all()
for inv in sample:
    print(f"      - {inv.expire_date}")

print("\n" + "=" * 80)
print("✅ Migration کامل شد!")
print("=" * 80)

db.close()
