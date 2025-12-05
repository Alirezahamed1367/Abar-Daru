"""
اسکریپت ایجاد انبار مجازی کالای در راه
"""
from database import SessionLocal
from models import Warehouse

db = SessionLocal()

# بررسی وجود انبار کالای در راه
transit = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()

if not transit:
    transit_warehouse = Warehouse(
        name="کالای در راه",
        code="TRANSIT",
        address="انبار مجازی",
        manager="سیستم"
    )
    db.add(transit_warehouse)
    db.commit()
    db.refresh(transit_warehouse)
    print(f"✅ انبار کالای در راه با شناسه {transit_warehouse.id} ایجاد شد")
else:
    print(f"⚠️ انبار کالای در راه قبلا با شناسه {transit.id} ایجاد شده است")

db.close()
