"""
اسکریپت تست برای بررسی کامل موجودی و گردش انبار داروی پیش‌بند
"""

import sys
sys.path.append('.')

from database import SessionLocal
from models import Drug, Inventory, Warehouse, Transfer
from sqlalchemy import func

def main():
    db = SessionLocal()
    
    print("=" * 80)
    print("بررسی کامل داروی پیش‌بند یکبار مصرف")
    print("=" * 80)
    
    # 1. پیدا کردن داروی پیش‌بند
    print("\n1. جستجوی داروی پیش‌بند...")
    pishband = db.query(Drug).filter(Drug.name.like('%پیش%بند%')).all()
    
    if not pishband:
        print("❌ داروی پیش‌بند یافت نشد!")
        db.close()
        return
    
    for drug in pishband:
        print(f"\n✅ دارو پیدا شد:")
        print(f"   ID: {drug.id}")
        print(f"   نام: {drug.name}")
        print(f"   دوز: {drug.dose}")
        print(f"   دارای تاریخ انقضا: {drug.has_expiry_date}")
        
        drug_id = drug.id
        
        # 2. بررسی موجودی در همه انبارها
        print(f"\n2. موجودی {drug.name} در همه انبارها:")
        print("-" * 80)
        
        inventories = db.query(Inventory).filter(Inventory.drug_id == drug_id).all()
        
        if not inventories:
            print("   ❌ هیچ موجودی یافت نشد!")
        else:
            total_qty = 0
            for inv in inventories:
                warehouse = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
                wh_name = warehouse.name if warehouse else "نامشخص"
                print(f"   📦 انبار: {wh_name} (ID: {inv.warehouse_id})")
                print(f"      - موجودی: {inv.quantity}")
                print(f"      - تاریخ انقضا: {inv.expire_date}")
                print(f"      - Inventory ID: {inv.id}")
                print()
                total_qty += inv.quantity
            
            print(f"   📊 کل موجودی در همه انبارها: {total_qty}")
        
        # 3. پیدا کردن انبار مشهد
        print(f"\n3. جستجوی انبار مشهد...")
        mashhad_warehouses = db.query(Warehouse).filter(
            Warehouse.name.like('%مشهد%')
        ).all()
        
        if not mashhad_warehouses:
            print("   ❌ انبار مشهد یافت نشد!")
        else:
            print(f"   ✅ {len(mashhad_warehouses)} انبار با نام مشهد یافت شد:")
            for wh in mashhad_warehouses:
                print(f"      - {wh.name} (ID: {wh.id})")
                
                # موجودی در این انبار
                inv_mashhad = db.query(Inventory).filter(
                    Inventory.warehouse_id == wh.id,
                    Inventory.drug_id == drug_id
                ).all()
                
                if inv_mashhad:
                    for inv in inv_mashhad:
                        print(f"        * موجودی: {inv.quantity}, انقضا: {inv.expire_date}, Inv ID: {inv.id}")
                else:
                    print(f"        * موجودی: 0 (رکوردی یافت نشد)")
        
        # 4. بررسی حواله‌های خروج
        print(f"\n4. بررسی حواله‌های خروجی:")
        print("-" * 80)
        
        transfers_out = db.query(Transfer).filter(
            Transfer.drug_id == drug_id
        ).order_by(Transfer.transfer_date.desc()).all()
        
        if not transfers_out:
            print("   ❌ هیچ حواله خروجی یافت نشد!")
        else:
            print(f"   ✅ {len(transfers_out)} حواله یافت شد:")
            for transfer in transfers_out:
                src_wh = db.query(Warehouse).filter(Warehouse.id == transfer.source_warehouse_id).first()
                dest_wh = db.query(Warehouse).filter(Warehouse.id == transfer.destination_warehouse_id).first()
                
                src_name = src_wh.name if src_wh else f"ID:{transfer.source_warehouse_id}"
                dest_name = dest_wh.name if dest_wh else "مصرف‌کننده" if transfer.consumer_id else "نامشخص"
                
                status_label = {
                    'pending': '⏳ در انتظار',
                    'confirmed': '✅ تایید شده',
                    'rejected': '❌ رد شده'
                }.get(transfer.status, transfer.status)
                
                print(f"      [{transfer.transfer_date}] {src_name} → {dest_name}")
                print(f"         تعداد ارسالی: {transfer.quantity_sent}, دریافتی: {transfer.quantity_received or 'N/A'}")
                print(f"         انقضا: {transfer.expire_date}, نوع: {transfer.transfer_type}")
                print(f"         وضعیت: {status_label}, Transfer ID: {transfer.id}")
        
        # 5. محاسبه تراز انبار
        print(f"\n5. محاسبه تراز انبار (خروجی‌ها و ورودی‌ها):")
        print("-" * 80)
        
        for wh in db.query(Warehouse).all():
            total_out_source = db.query(func.sum(Transfer.quantity_sent)).filter(
                Transfer.source_warehouse_id == wh.id,
                Transfer.drug_id == drug_id,
                Transfer.status == 'confirmed'
            ).scalar() or 0
            
            # ورودی‌های از حواله (به این انبار)
            total_in_transfer = db.query(func.sum(Transfer.quantity_received)).filter(
                Transfer.destination_warehouse_id == wh.id,
                Transfer.drug_id == drug_id,
                Transfer.status == 'confirmed'
            ).scalar() or 0
            
            # موجودی واقعی
            actual_inventory = db.query(func.sum(Inventory.quantity)).filter(
                Inventory.warehouse_id == wh.id,
                Inventory.drug_id == drug_id
            ).scalar() or 0
            
            if total_out_source != 0 or total_in_transfer != 0 or actual_inventory != 0:
                print(f"   {wh.name} (ID: {wh.id}):")
                print(f"      ورودی حواله: {total_in_transfer}")
                print(f"      خروجی حواله: {total_out_source}")
                print(f"      موجودی واقعی در Inventory: {actual_inventory}")
                print()
    
    print("\n" + "=" * 80)
    print("پایان بررسی")
    print("=" * 80)
    
    db.close()

if __name__ == "__main__":
    main()
