"""
Script to initialize database and create test data
"""
from database import SessionLocal, init_db
from models import User, Warehouse, Supplier, Drug
from passlib.context import CryptContext

def setup_database():
    print("Initializing database...")
    init_db()
    
    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Create users if not exist
    if not db.query(User).filter(User.username == "superadmin").first():
        user = User(
            username="superadmin",
            password=pwd_context.hash("A25893Aa"),
            full_name="Super Admin",
            access_level="superadmin"
        )
        db.add(user)
        print("✓ Created superadmin user")
    
    if not db.query(User).filter(User.username == "admin").first():
        user = User(
            username="admin",
            password=pwd_context.hash("admin"),
            full_name="Admin",
            access_level="admin"
        )
        db.add(user)
        print("✓ Created admin user")
    
    # Create sample warehouses
    if db.query(Warehouse).count() == 0:
        warehouses = [
            Warehouse(name="انبار مرکزی", code="WH001", address="تهران", manager="علی محمدی"),
            Warehouse(name="انبار شعبه شمال", code="WH002", address="رشت", manager="حسن احمدی"),
            Warehouse(name="انبار شعبه جنوب", code="WH003", address="شیراز", manager="رضا کریمی"),
        ]
        db.add_all(warehouses)
        print("✓ Created sample warehouses")
    
    # Create sample suppliers
    if db.query(Supplier).count() == 0:
        suppliers = [
            Supplier(name="شرکت داروسازی سینا", phone="021-12345678", address="تهران"),
            Supplier(name="شرکت داروسازی البرز", phone="021-87654321", address="کرج"),
        ]
        db.add_all(suppliers)
        print("✓ Created sample suppliers")
    
    # Create sample drugs
    if db.query(Drug).count() == 0:
        drugs = [
            Drug(name="قرص سرماخوردگی", dose="500mg", package_type="بسته 10 عددی", description="برای درمان سرماخوردگی"),
            Drug(name="آمپول ویتامین B12", dose="1ml", package_type="جعبه 5 عددی", description="تقویت کننده"),
            Drug(name="شربت سرفه", dose="120ml", package_type="بطری", description="تسکین سرفه"),
            Drug(name="قرص مسکن", dose="400mg", package_type="بسته 20 عددی", description="ضد درد"),
        ]
        db.add_all(drugs)
        print("✓ Created sample drugs")
    
    db.commit()
    db.close()
    print("\n✅ Database setup completed successfully!")
    print("\nLogin credentials:")
    print("  superadmin / A25893Aa")
    print("  admin / admin")

if __name__ == "__main__":
    setup_database()
