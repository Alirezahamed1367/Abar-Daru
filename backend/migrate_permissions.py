"""
Migration script to add Permission model and user_permissions table
"""
from database import SessionLocal, engine
from models import Base, Permission
from sqlalchemy import inspect

def migrate_permissions():
    db = SessionLocal()
    
    # Create all tables (will only create new ones)
    Base.metadata.create_all(bind=engine)
    
    # Check if permissions table has data
    existing_perms = db.query(Permission).count()
    
    if existing_perms == 0:
        print("Creating default permissions...")
        
        default_permissions = [
            {"name": "view_dashboard", "description": "مشاهده داشبورد"},
            {"name": "view_inventory", "description": "مشاهده موجودی انبار"},
            {"name": "add_inventory", "description": "ثبت رسید ورودی"},
            {"name": "edit_inventory", "description": "ویرایش رسید"},
            {"name": "delete_inventory", "description": "حذف رسید"},
            {"name": "view_transfers", "description": "مشاهده حواله‌ها"},
            {"name": "add_transfer", "description": "ثبت حواله"},
            {"name": "confirm_transfer", "description": "تایید حواله"},
            {"name": "reject_transfer", "description": "رد حواله"},
            {"name": "delete_transfer", "description": "حذف حواله"},
            {"name": "view_drugs", "description": "مشاهده داروها"},
            {"name": "add_drug", "description": "تعریف دارو"},
            {"name": "edit_drug", "description": "ویرایش دارو"},
            {"name": "delete_drug", "description": "حذف دارو"},
            {"name": "view_warehouses", "description": "مشاهده انبارها"},
            {"name": "manage_warehouses", "description": "مدیریت انبارها"},
            {"name": "view_suppliers", "description": "مشاهده تامین‌کنندگان"},
            {"name": "manage_suppliers", "description": "مدیریت تامین‌کنندگان"},
            {"name": "view_consumers", "description": "مشاهده مصرف‌کنندگان"},
            {"name": "manage_consumers", "description": "مدیریت مصرف‌کنندگان"},
            {"name": "view_users", "description": "مشاهده کاربران"},
            {"name": "manage_users", "description": "مدیریت کاربران"},
            {"name": "view_logs", "description": "مشاهده لاگ‌ها"},
            {"name": "view_reports", "description": "مشاهده گزارشات"},
            {"name": "export_reports", "description": "دریافت خروجی گزارشات"},
            {"name": "backup_database", "description": "پشتیبان‌گیری دیتابیس"},
            {"name": "manage_settings", "description": "مدیریت تنظیمات سیستم"},
        ]
        
        for perm_data in default_permissions:
            perm = Permission(**perm_data)
            db.add(perm)
        
        db.commit()
        print(f"✅ {len(default_permissions)} default permissions created.")
    else:
        print(f"ℹ️  Permissions table already has {existing_perms} records.")
    
    db.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_permissions()
