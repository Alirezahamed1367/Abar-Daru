# Added imports and router definition before any @router usage to avoid NameError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, get_db
from models import User, Warehouse, Supplier, Consumer, Drug, Inventory, OperationLog, Transfer, SystemSettings, Permission
from passlib.context import CryptContext
from datetime import datetime, timedelta
import shutil, os
from PIL import Image
from fastapi.responses import FileResponse, JSONResponse
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
import arabic_reshaper
from bidi.algorithm import get_display
import jdatetime
import jwt
from functools import wraps
from typing import Optional
from pydantic import BaseModel

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Settings
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="توکن احراز هویت یافت نشد")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="توکن منقضی شده است")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    payload = verify_token(authorization)
    user = db.query(User).filter(User.id == payload.get('user_id')).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    return user

def require_access(access_levels: list):
    def decorator(func):
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if current_user.access_level not in access_levels:
                raise HTTPException(status_code=403, detail="شما دسترسی به این عملیات را ندارید")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def require_edit_permission(current_user: User = Depends(get_current_user)):
    """
    Prevent viewers from editing/creating/deleting
    Only warehouseman, admin, superadmin can edit
    """
    if current_user.access_level == 'viewer':
        raise HTTPException(status_code=403, detail="مشاهده‌گران دسترسی ثبت/ویرایش ندارند")
    return current_user

def check_warehouse_access(user: User, warehouse_id: int):
    """
    Check if user has access to specific warehouse
    - admin/superadmin: access to all warehouses
    - warehouseman: only their assigned warehouses
    - viewer: no edit access (already blocked by require_edit_permission)
    """
    if user.access_level in ['admin', 'superadmin']:
        return True
    
    if user.access_level == 'warehouseman':
        user_warehouse_ids = [w.id for w in user.warehouses]
        return warehouse_id in user_warehouse_ids
    
    return False

# Dependency

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def log_operation(db: Session, action: str, details: str, user_id: int = None, current_user: User = None):
    try:
        # If current_user provided, use their ID
        if current_user and not user_id:
            user_id = current_user.id
        
        log = OperationLog(
            user_id=user_id,
            action=action,
            details=details,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log operation: {e}")

# Public endpoint for login page - returns only usernames
@router.get('/users/login-list')
def get_users_for_login(db: Session = Depends(get_db)):
    """
    Public endpoint that returns minimal user info for login dropdown
    Only returns username and full_name - no sensitive data
    """
    users = db.query(User).all()
    return [{"username": u.username, "full_name": u.full_name} for u in users]

# User registration/login/password recovery
@router.post('/login')
def login_user(username: str, password: str, db: Session = Depends(get_db)):
    # Convert username to lowercase for case-insensitive login
    username_lower = username.lower()
    user = db.query(User).filter(User.username == username_lower).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")
    
    token = create_access_token({"user_id": user.id, "username": user.username, "access_level": user.access_level})
    
    # Get user warehouses
    user_warehouses_ids = [w.id for w in user.warehouses]

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "access_level": user.access_level,
        "warehouses": user_warehouses_ids,
        "token": token
    }

@router.post('/recover-password')
def recover_password(username: str, new_password: str, db: Session = Depends(get_db)):
    # Convert username to lowercase for case-insensitive recovery
    username_lower = username.lower()
    user = db.query(User).filter(User.username == username_lower).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    user.password = pwd_context.hash(new_password)
    db.commit()
    return {"message": "رمز عبور با موفقیت تغییر یافت"}

# CRUD for Warehouses, Suppliers, Consumers, Drugs
@router.get('/warehouses')
def get_warehouses(db: Session = Depends(get_db), include_virtual: bool = False):
    """
    دریافت لیست انبارها
    به طور پیش‌فرض، انبارهای مجازی (مانند TRANSIT) نمایش داده نمی‌شوند
    """
    query = db.query(Warehouse)
    if not include_virtual:
        query = query.filter(Warehouse.is_virtual == False)
    return query.all()

@router.post('/warehouses')
def add_warehouse(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can create warehouses
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند انبار تعریف کنند")
    warehouse = Warehouse(**data)
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    log_operation(db, "Add Warehouse", f"افزودن انبار: {warehouse.name}")
    return warehouse

@router.put('/warehouses/{warehouse_id}')
def update_warehouse(warehouse_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can update warehouses
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند انبار ویرایش کنند")
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="انبار یافت نشد")
    for key, value in data.items():
        setattr(warehouse, key, value)
    db.commit()
    log_operation(db, "Update Warehouse", f"ویرایش انبار: {warehouse.name}")
    return warehouse

@router.delete('/warehouses/{warehouse_id}')
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can delete warehouses
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند انبار حذف کنند")
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="انبار یافت نشد")
    
    name = warehouse.name
    
    # Check if warehouse has inventory
    inventory_count = db.query(Inventory).filter(Inventory.warehouse_id == warehouse_id).count()
    if inventory_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"این انبار دارای {inventory_count} رسید موجودی است. ابتدا موجودی‌های مربوطه را حذف کنید"
        )
    
    # Check if warehouse is used in transfers (source or destination)
    transfer_count = db.query(Transfer).filter(
        (Transfer.source_warehouse_id == warehouse_id) | 
        (Transfer.destination_warehouse_id == warehouse_id)
    ).count()
    if transfer_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"این انبار در {transfer_count} انتقال استفاده شده است. ابتدا انتقال‌های مربوطه را حذف کنید"
        )
    
    db.delete(warehouse)
    db.commit()
    log_operation(db, "Delete Warehouse", f"حذف انبار: {name}")
    return {"message": "انبار حذف شد"}

@router.get('/drugs')
def get_drugs(db: Session = Depends(get_db)):
    return db.query(Drug).all()

# Pydantic models for drug create/update (JSON body)
class DrugCreate(BaseModel):
    name: str
    dose: Optional[str] = None
    package_type: Optional[str] = None
    description: Optional[str] = None
    has_expiry_date: Optional[bool] = True

class DrugResponse(BaseModel):
    id: int
    name: str
    dose: Optional[str] = None
    package_type: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    image_data: Optional[str] = None
    has_expiry_date: Optional[bool] = True
    
    class Config:
        from_attributes = True  # For Pydantic v2 (was orm_mode in v1)

class DrugUpdate(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    package_type: Optional[str] = None
    description: Optional[str] = None
    has_expiry_date: Optional[bool] = None


@router.post('/drugs', response_model=DrugResponse)
def add_drug(data: DrugCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can create drugs
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند دارو تعریف کنند")
    drug = Drug(**data.dict())
    db.add(drug)
    db.commit()
    db.refresh(drug)
    log_operation(db, "Add Drug", f"افزودن دارو: {drug.name}")
    # Return drug object - FastAPI will serialize it using DrugResponse model
    return drug


@router.put('/drugs/{drug_id}', response_model=DrugResponse)
def update_drug(drug_id: int, data: DrugUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can update drugs
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند دارو ویرایش کنند")
    drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="دارو یافت نشد")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(drug, key, value)
    db.commit()
    db.refresh(drug)
    log_operation(db, "Update Drug", f"ویرایش دارو: {drug.name}")
    return drug
    return JSONResponse(content=jsonable_encoder(drug))

@router.delete('/drugs/{drug_id}')
def delete_drug(drug_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can delete drugs
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند دارو حذف کنند")
    import os
    
    drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="دارو یافت نشد")
    
    name = drug.name
    
    # Check if drug is used in inventory
    inventory_count = db.query(Inventory).filter(Inventory.drug_id == drug_id).count()
    if inventory_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"این دارو در {inventory_count} رسید انبار استفاده شده است. ابتدا رسیدهای مربوطه را حذف کنید"
        )
    
    # Check if drug is used in transfers
    transfer_count = db.query(Transfer).filter(Transfer.drug_id == drug_id).count()
    if transfer_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"این دارو در {transfer_count} انتقال استفاده شده است. ابتدا انتقال‌های مربوطه را حذف کنید"
        )
    
    # Delete image file from disk if exists
    if drug.image:
        image_path = drug.image
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
                print(f"Deleted image file: {image_path}")
            except Exception as e:
                print(f"Error deleting image file: {e}")
    
    # Delete drug from database (image_data will be automatically removed)
    db.delete(drug)
    db.commit()
    
    # Log operation (keep log for audit trail)
    log_operation(db, "Delete Drug", f"حذف دارو: {name}")
    
    return {"message": "دارو و تصاویر مربوطه حذف شد"}

@router.get('/suppliers')
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()

@router.post('/suppliers')
def add_supplier(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can create suppliers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند تأمین‌کننده تعریف کنند")
    supplier = Supplier(**data)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put('/suppliers/{supplier_id}')
def update_supplier(supplier_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can update suppliers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند تأمین‌کننده ویرایش کنند")
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="تأمین‌کننده یافت نشد")
    
    for key, value in data.items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.delete('/suppliers/{supplier_id}')
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can delete suppliers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند تأمین‌کننده حذف کنند")
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="تأمین‌کننده یافت نشد")
    
    # Check if supplier is used in inventory
    inventory_count = db.query(Inventory).filter(Inventory.supplier_id == supplier_id).count()
    if inventory_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"این تأمین‌کننده در {inventory_count} رسید انبار استفاده شده است. ابتدا رسیدهای مربوطه را حذف کنید"
        )
    
    name = db_supplier.name
    db.delete(db_supplier)
    db.commit()
    log_operation(db, "Delete Supplier", f"حذف تأمین‌کننده: {name}")
    return {"message": "تأمین‌کننده با موفقیت حذف شد"}

@router.get('/consumers')
def get_consumers(db: Session = Depends(get_db)):
    return db.query(Consumer).all()

@router.post('/consumers')
def add_consumer(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can create consumers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند مصرف‌کننده تعریف کنند")
    consumer = Consumer(**data)
    db.add(consumer)
    db.commit()
    db.refresh(consumer)
    return consumer

@router.put('/consumers/{consumer_id}')
def update_consumer(consumer_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can update consumers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند مصرف‌کننده ویرایش کنند")
    db_consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not db_consumer:
        raise HTTPException(status_code=404, detail="مصرف‌کننده یافت نشد")
    
    for key, value in data.items():
        setattr(db_consumer, key, value)
    
    db.commit()
    db.refresh(db_consumer)
    return db_consumer

@router.delete('/consumers/{consumer_id}')
def delete_consumer(consumer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only admin/superadmin can delete consumers
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط مدیران می‌توانند مصرف‌کننده حذف کنند")
    db_consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not db_consumer:
        raise HTTPException(status_code=404, detail="مصرف‌کننده یافت نشد")
    
    # Check if consumer is used in transfers
    transfer_count = db.query(Transfer).filter(Transfer.consumer_id == consumer_id).count()
    if transfer_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"این مصرف‌کننده در {transfer_count} انتقال استفاده شده است. ابتدا انتقال‌های مربوطه را حذف کنید"
        )
    
    name = db_consumer.name
    db.delete(db_consumer)
    db.commit()
    log_operation(db, "Delete Consumer", f"حذف مصرف‌کننده: {name}")
    return {"message": "مصرف‌کننده با موفقیت حذف شد"}

@router.get('/inventory')
def get_inventory(db: Session = Depends(get_db), include_virtual: bool = False, include_disposed: bool = False):
    """
    دریافت موجودی انبارها
    به طور پیش‌فرض، موجودی انبارهای مجازی (TRANSIT) و داروهای معدوم شده نمایش داده نمی‌شود
    """
    query = db.query(Inventory)
    
    # Filter out disposed items by default
    if not include_disposed:
        query = query.filter(Inventory.is_disposed == False)
    
    if not include_virtual:
        # Join with Warehouse and filter out virtual warehouses
        query = query.join(Warehouse).filter(Warehouse.is_virtual == False)
    
    return query.order_by(Inventory.expire_date.asc()).all()

@router.post('/inventory')
def add_inventory(data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_edit_permission)):
    # Check warehouse access for warehousemen
    warehouse_id = data.get('warehouse_id')
    if not check_warehouse_access(current_user, warehouse_id):
        raise HTTPException(status_code=403, detail="شما فقط می‌توانید برای انبار اختصاصی خود رسید ثبت کنید")
    
    # Check for duplicate (warehouse_id + drug_id + expire_date)
    existing = db.query(Inventory).filter(
        Inventory.warehouse_id == data.get('warehouse_id'),
        Inventory.drug_id == data.get('drug_id'),
        Inventory.expire_date == data.get('expire_date')
    ).first()
    
    if existing:
        # If exists, just update quantity instead of creating new record
        existing.quantity += data.get('quantity', 0)
        if 'supplier_id' in data and data['supplier_id']:
            existing.supplier_id = data['supplier_id']
        if 'entry_date' in data and data['entry_date']:
            existing.entry_date = data['entry_date']
        db.commit()
        db.refresh(existing)
        
        drug = db.query(Drug).filter(Drug.id == existing.drug_id).first()
        drug_name = drug.name if drug else "دارو نامشخص"
        log_operation(db, "Update Inventory (Duplicate)", f"افزایش {data.get('quantity', 0)} عدد به موجودی {drug_name} (انقضا: {data.get('expire_date')})")
        
        return existing
    
    # Create new inventory record
    inventory = Inventory(**data)
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    
    # Get drug name for log
    drug = db.query(Drug).filter(Drug.id == inventory.drug_id).first()
    drug_name = drug.name if drug else "دارو نامشخص"
    log_operation(db, "Add Inventory", f"رسید {inventory.quantity} عدد از {drug_name}")
    
    return inventory

@router.put('/inventory/{inventory_id}')
def update_inventory(inventory_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_edit_permission)):
    inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="رسید یافت نشد")
    
    # Check warehouse access
    if not check_warehouse_access(current_user, inventory.warehouse_id):
        raise HTTPException(status_code=403, detail="شما فقط می‌توانید رسیدهای انبار خود را ویرایش کنید")
    
    for key, value in data.items():
        setattr(inventory, key, value)
    
    db.commit()
    db.refresh(inventory)
    log_operation(db, "Update Inventory", f"ویرایش موجودی شماره: {inventory_id}")
    return inventory

@router.delete('/inventory/{inventory_id}')
def delete_inventory(inventory_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_edit_permission)):
    inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="رسید یافت نشد")
    
    # Check warehouse access
    if not check_warehouse_access(current_user, inventory.warehouse_id):
        raise HTTPException(status_code=403, detail="شما فقط می‌توانید رسیدهای انبار خود را حذف کنید")
    
    # Get info for logging
    drug = db.query(Drug).filter(Drug.id == inventory.drug_id).first()
    warehouse = db.query(Warehouse).filter(Warehouse.id == inventory.warehouse_id).first()
    drug_name = drug.name if drug else "نامشخص"
    warehouse_name = warehouse.name if warehouse else "نامشخص"
    
    # Delete inventory completely
    db.delete(inventory)
    db.commit()
    
    # Log for audit trail
    log_operation(db, "Delete Inventory", f"حذف رسید: {drug_name} - {warehouse_name} - تعداد: {inventory.quantity}")
    
    return {"message": "رسید حذف شد"}

@router.get('/logs')
def get_logs(db: Session = Depends(get_db)):
    # Action translations to Persian
    action_translations = {
        "Add Warehouse": "افزودن انبار",
        "Update Warehouse": "ویرایش انبار",
        "Delete Warehouse": "حذف انبار",
        "Add Drug": "افزودن دارو",
        "Update Drug": "ویرایش دارو",
        "Delete Drug": "حذف دارو",
        "Add Inventory": "رسید انبار",
        "Update Inventory": "ویرایش موجودی",
        "Update Inventory (Duplicate)": "افزایش موجودی",
        "Delete Inventory": "حذف موجودی",
        "Upload Drug Image": "آپلود تصویر دارو",
        "Create Transfer": "ایجاد حواله",
        "Confirm Transfer": "تایید حواله",
        "Reject Transfer": "رد حواله",
        "Delete Transfer": "حذف حواله",
        "Resolve Mismatch": "رفع مغایرت",
        "Add Supplier": "افزودن تامین‌کننده",
        "Update Supplier": "ویرایش تامین‌کننده",
        "Delete Supplier": "حذف تامین‌کننده",
        "Add Consumer": "افزودن مصرف‌کننده",
        "Update Consumer": "ویرایش مصرف‌کننده",
        "Delete Consumer": "حذف مصرف‌کننده"
    }
    
    logs = db.query(OperationLog).order_by(OperationLog.id.desc()).all()
    
    # Translate actions
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "action": action_translations.get(log.action, log.action),
            "action_en": log.action,  # Keep original for reference
            "details": log.details,
            "timestamp": log.timestamp,
            "user": {
                "id": log.user.id,
                "username": log.user.username,
                "full_name": log.user.full_name
            } if log.user else None
        }
        result.append(log_dict)
    
    return result

# Drug image upload & compression
@router.post('/upload-drug-image')
def upload_drug_image(drug_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    import base64
    from io import BytesIO
    
    drug = db.query(Drug).get(drug_id)
    if not drug:
        raise HTTPException(status_code=404, detail="دارو یافت نشد")
    
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        raise HTTPException(status_code=400, detail="فرمت تصویر باید JPG, PNG, GIF یا WebP باشد")
    
    # Read and compress image
    img = Image.open(file.file)
    
    # Convert RGBA to RGB if needed (for JPEG)
    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    
    # Resize if too large (max 800x800)
    max_size = 800
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Save to BytesIO for Base64 encoding
    buffered = BytesIO()
    img.save(buffered, format='JPEG', optimize=True, quality=75)
    img_bytes = buffered.getvalue()
    
    # Check final size
    if len(img_bytes) > 1 * 1024 * 1024:  # 1MB limit
        # Try with lower quality
        buffered = BytesIO()
        img.save(buffered, format='JPEG', optimize=True, quality=60)
        img_bytes = buffered.getvalue()
        if len(img_bytes) > 1 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="حجم تصویر بعد از فشرده‌سازی بیش از ۱ مگابایت است")
    
    # Encode to Base64 and save in database
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    drug.image_data = f"data:image/jpeg;base64,{img_base64}"
    
    # Also save as file cache for faster access
    save_path = f"images/drug_{drug_id}.jpg"
    with open(save_path, "wb") as f:
        f.write(img_bytes)
    drug.image = save_path
    
    db.commit()
    log_operation(db, "Upload Drug Image", f"آپلود تصویر دارو: {drug.name}")
    return {"image": save_path, "size": len(img_bytes)}

# Get drug image with fallback to database
@router.get('/drug-image/{drug_id}')
def get_drug_image(drug_id: int, db: Session = Depends(get_db)):
    import base64
    from io import BytesIO
    
    drug = db.query(Drug).get(drug_id)
    if not drug:
        raise HTTPException(status_code=404, detail="دارو یافت نشد")
    
    # Try to read from file cache first
    if drug.image and os.path.exists(drug.image):
        return FileResponse(drug.image, media_type="image/jpeg")
    
    # Fallback to database if file doesn't exist
    if drug.image_data:
        # Extract base64 data
        if ',' in drug.image_data:
            base64_data = drug.image_data.split(',')[1]
        else:
            base64_data = drug.image_data
        
        # Decode and return
        img_bytes = base64.b64decode(base64_data)
        
        # Recreate cache file
        save_path = f"images/drug_{drug_id}.jpg"
        with open(save_path, "wb") as f:
            f.write(img_bytes)
        drug.image = save_path
        db.commit()
        
        return FileResponse(save_path, media_type="image/jpeg")
    
    raise HTTPException(status_code=404, detail="تصویر یافت نشد")

# Inventory receipt and transfer
# ... (implement endpoints for inventory receipt, transfer, and logs)

# Backup database
@router.get('/backup-db')
def backup_db(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    import os
    
    # Only admin and superadmin can create backups
    if current_user.access_level not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="فقط ادمین می‌تواند بکاپ ایجاد کند")
    
    # Use absolute paths for database and backup directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(base_dir, 'pharmacy.db')
    backup_dir = os.path.join(base_dir, 'db_backup')
    
    # Create backup directory if it doesn't exist
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f'pharmacy_{timestamp}.db'
    dst = os.path.join(backup_dir, filename)
    
    try:
        shutil.copy(src, dst)
        
        # Log the backup operation
        log = OperationLog(
            user_id=current_user.id,
            action="Backup Database",
            details=f"بکاپ دیتابیس ایجاد شد: {filename}",
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        )
        db.add(log)
        db.commit()
        
        return {"backup": filename, "message": f"بکاپ با موفقیت ایجاد شد: {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطا در ایجاد بکاپ: {str(e)}")

# Expiring drugs dashboard
@router.get('/expiring-drugs')
def expiring_drugs(db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    
    # Get expiry warning days from settings (default 90 days)
    warning_days_setting = db.query(SystemSettings).filter(SystemSettings.key == 'exp_warning_days').first()
    warning_days = int(warning_days_setting.value) if warning_days_setting else 90
    
    # Calculate cutoff date
    cutoff_date = datetime.now() + timedelta(days=warning_days)
    cutoff_str = cutoff_date.strftime('%Y-%m')
    
    # Query inventory with expiring drugs, JOIN with drugs to filter has_expiry_date
    results = db.query(Inventory).join(Drug).filter(
        Drug.has_expiry_date == True,  # Only drugs that have expiry dates
        Inventory.expire_date.isnot(None),
        Inventory.expire_date <= cutoff_str,
        Inventory.quantity > 0,
        Inventory.is_disposed == False  # Exclude disposed items
    ).all()
    
    output = []
    for inv in results:
        drug = db.query(Drug).filter(Drug.id == inv.drug_id).first()
        wh = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
        output.append({
            'name': drug.name if drug else 'نامشخص',
            'warehouse': wh.name if wh else 'نامشخص',
            'quantity': inv.quantity,
            'expire': inv.expire_date
        })
    
    return output

@router.get('/disposed-drugs')
def disposed_drugs(db: Session = Depends(get_db)):
    """
    دریافت لیست داروهای معدوم شده
    """
    results = db.query(Inventory).join(Drug).join(Warehouse).filter(
        Inventory.is_disposed == True
    ).all()
    
    output = []
    for inv in results:
        drug = db.query(Drug).filter(Drug.id == inv.drug_id).first()
        wh = db.query(Warehouse).filter(Warehouse.id == inv.warehouse_id).first()
        
        # Find disposal transfer for this item
        disposal_transfer = db.query(Transfer).filter(
            Transfer.source_warehouse_id == inv.warehouse_id,
            Transfer.drug_id == inv.drug_id,
            Transfer.expire_date == inv.expire_date,
            Transfer.transfer_type == 'disposal',
            Transfer.status == 'confirmed'
        ).order_by(Transfer.confirmed_at.desc()).first()
        
        output.append({
            'id': inv.id,
            'name': drug.name if drug else 'نامشخص',
            'warehouse': wh.name if wh else 'نامشخص',
            'quantity': inv.quantity,
            'expire_date': inv.expire_date,
            'entry_date': inv.entry_date,
            'disposal_date': disposal_transfer.confirmed_at if disposal_transfer else None,
            'disposal_transfer_id': disposal_transfer.id if disposal_transfer else None
        })
    
    return output

# Transfer/Havaleh endpoints
@router.post('/transfer/create')
def create_transfer(
    source_warehouse_id: int, 
    drug_id: int, 
    quantity: int,
    expire_date: Optional[str] = None,
    destination_warehouse_id: Optional[int] = None,
    consumer_id: Optional[int] = None,
    transfer_type: str = 'warehouse',
    transfer_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_edit_permission)
):
    # Log the request for debugging
    print(f"[DEBUG] Transfer Create Request:")
    print(f"   User: {current_user.username} (Level: {current_user.access_level})")
    print(f"   Source Warehouse: {source_warehouse_id}")
    print(f"   Drug: {drug_id}, Expire: {expire_date}, Qty: {quantity}")
    print(f"   Type: {transfer_type}")
    
    # Check if drug requires expiry date
    drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="دارو یافت نشد")
    
    # If drug requires expiry but none provided
    if not expire_date:
        if drug.has_expiry_date:
            raise HTTPException(status_code=400, detail="تاریخ انقضا برای این دارو الزامی است")
        else:
            # For drugs without expiry, use None (NULL in database)
            expire_date = None
            print(f"   [INFO] Drug doesn't require expiry, using None for expire_date")
    
    # Check source warehouse access for warehousemen
    has_access = check_warehouse_access(current_user, source_warehouse_id)
    print(f"   Warehouse Access Check: {has_access}")
    
    if not has_access:
        print(f"   [ERROR] ACCESS DENIED for user {current_user.username}")
        raise HTTPException(status_code=403, detail="شما فقط می‌توانید از انبار اختصاصی خود حواله صادر کنید")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Check if source has enough inventory
    inv_source = db.query(Inventory).filter(
        Inventory.warehouse_id == source_warehouse_id,
        Inventory.drug_id == drug_id,
        Inventory.expire_date == expire_date
    ).first()
    if not inv_source or inv_source.quantity < quantity:
        raise HTTPException(status_code=400, detail="موجودی انبار مبدا کافی نیست")
    
    # Deduct from source warehouse
    inv_source.quantity -= quantity
    
    # Add to transit warehouse
    inv_transit = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == drug_id,
        Inventory.expire_date == expire_date
    ).first()
    
    if inv_transit:
        inv_transit.quantity += quantity
    else:
        inv_transit = Inventory(
            warehouse_id=transit_wh.id,
            drug_id=drug_id,
            expire_date=expire_date,
            quantity=quantity,
            supplier_id=inv_source.supplier_id
        )
        db.add(inv_transit)
    
    # Create transfer record
    status = 'pending'
    transfer = Transfer(
        source_warehouse_id=source_warehouse_id,
        destination_warehouse_id=destination_warehouse_id,
        consumer_id=consumer_id,
        transfer_type=transfer_type,
        drug_id=drug_id,
        expire_date=expire_date,
        transfer_date=transfer_date,
        quantity_sent=quantity,
        quantity_received=0,
        status=status,
        created_by=current_user.username,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        confirmed_at=None
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    
    log_operation(db, "Create Transfer", f"حواله {quantity} عدد دارو {drug_id} از انبار {source_warehouse_id} به کالای در راه")
    return transfer

@router.put('/transfer/{transfer_id}')
def update_transfer(transfer_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """ویرایش حواله pending - فقط صادرکننده می‌تواند ویرایش کند"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    # Only pending transfers can be edited
    if transfer.status != 'pending':
        raise HTTPException(status_code=400, detail="فقط حواله‌های در انتظار قابل ویرایش هستند")
    
    # Only creator can edit (or admin/superadmin)
    if current_user.access_level not in ['admin', 'superadmin']:
        if transfer.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="فقط صادرکننده حواله می‌تواند آن را ویرایش کند")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Reverse old transfer (return from transit to source)
    old_transit_inv = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if old_transit_inv and old_transit_inv.quantity >= transfer.quantity_sent:
        old_transit_inv.quantity -= transfer.quantity_sent
    
    old_source_inv = db.query(Inventory).filter(
        Inventory.warehouse_id == transfer.source_warehouse_id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if old_source_inv:
        old_source_inv.quantity += transfer.quantity_sent
    else:
        old_source_inv = Inventory(
            warehouse_id=transfer.source_warehouse_id,
            drug_id=transfer.drug_id,
            expire_date=transfer.expire_date,
            quantity=transfer.quantity_sent,
            supplier_id=old_transit_inv.supplier_id if old_transit_inv and old_transit_inv.supplier_id else 1
        )
        db.add(old_source_inv)
    
    # Apply new transfer data
    new_source_warehouse_id = data.get('source_warehouse_id', transfer.source_warehouse_id)
    new_drug_id = data.get('drug_id', transfer.drug_id)
    new_expire_date = data.get('expire_date', transfer.expire_date)
    new_quantity = data.get('quantity_sent', transfer.quantity_sent)
    
    # Check new source has enough inventory
    new_source_inv = db.query(Inventory).filter(
        Inventory.warehouse_id == new_source_warehouse_id,
        Inventory.drug_id == new_drug_id,
        Inventory.expire_date == new_expire_date
    ).first()
    
    if not new_source_inv or new_source_inv.quantity < new_quantity:
        raise HTTPException(status_code=400, detail="موجودی انبار مبدا جدید کافی نیست")
    
    # Deduct from new source
    new_source_inv.quantity -= new_quantity
    
    # Add to transit
    new_transit_inv = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == new_drug_id,
        Inventory.expire_date == new_expire_date
    ).first()
    
    if new_transit_inv:
        new_transit_inv.quantity += new_quantity
    else:
        new_transit_inv = Inventory(
            warehouse_id=transit_wh.id,
            drug_id=new_drug_id,
            expire_date=new_expire_date,
            quantity=new_quantity,
            supplier_id=new_source_inv.supplier_id
        )
        db.add(new_transit_inv)
    
    # Update transfer record
    for key, value in data.items():
        setattr(transfer, key, value)
    
    db.commit()
    db.refresh(transfer)
    
    log_operation(db, "Update Transfer", f"ویرایش حواله شماره {transfer_id}")
    return transfer

@router.post('/transfer/{transfer_id}/confirm')
def confirm_transfer(transfer_id: int, quantity_received: int, db: Session = Depends(get_db), current_user: User = Depends(require_edit_permission)):
    """
    تایید حواله با مقدار دریافتی
    - اگر quantity_received == quantity_sent: وضعیت confirmed
    - اگر quantity_received != quantity_sent: وضعیت mismatch و مانده در TRANSIT باقی می‌ماند
    """
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    # Check destination warehouse access for warehousemen
    if transfer.transfer_type == 'warehouse':
        if not check_warehouse_access(current_user, transfer.destination_warehouse_id):
            raise HTTPException(status_code=403, detail="شما فقط می‌توانید حواله‌های ورودی به انبار خود را تایید کنید")
    
    if transfer.status != 'pending':
        raise HTTPException(status_code=400, detail="فقط حواله‌های در انتظار قابل تایید هستند")
    
    # Validate quantity_received
    if quantity_received <= 0:
        raise HTTPException(status_code=400, detail="تعداد دریافتی باید بیشتر از صفر باشد")
    
    if quantity_received > transfer.quantity_sent:
        raise HTTPException(status_code=400, detail="تعداد دریافتی نمی‌تواند بیشتر از تعداد ارسالی باشد")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Get transit inventory
    inv_transit = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if not inv_transit or inv_transit.quantity < quantity_received:
        raise HTTPException(status_code=400, detail="موجودی کالای در راه کافی نیست")
    
    # Deduct received quantity from transit
    inv_transit.quantity -= quantity_received
    
    # Handle disposal transfers - mark source inventory as disposed
    if transfer.transfer_type == 'disposal':
        # Find source inventory and mark as disposed
        source_inv = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.source_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if source_inv:
            source_inv.is_disposed = True
            log_operation(db, "Dispose Inventory", 
                         f"معدوم سازی {quantity_received} عدد {source_inv.drug.name} از انبار {source_inv.warehouse.name}")
    
    # Add to destination warehouse (only for normal warehouse transfers)
    elif transfer.transfer_type == 'warehouse':
        inv_dest = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.destination_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_dest:
            inv_dest.quantity += quantity_received
        else:
            inv_dest = Inventory(
                warehouse_id=transfer.destination_warehouse_id,
                drug_id=transfer.drug_id,
                expire_date=transfer.expire_date,
                quantity=quantity_received,
                supplier_id=inv_transit.supplier_id
            )
            db.add(inv_dest)
    
    # Update transfer record
    transfer.quantity_received = quantity_received
    transfer.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Check if quantities match
    if quantity_received == transfer.quantity_sent:
        transfer.status = 'confirmed'
    else:
        transfer.status = 'mismatch'
        # Mismatch: difference remains in TRANSIT for admin to resolve
    
    db.commit()
    log_operation(db, "Confirm Transfer", f"حواله {transfer_id}: دریافت {quantity_received} عدد از {transfer.quantity_sent} عدد ارسالی")
    return transfer

@router.get('/transfer/pending')
def get_pending_transfers(db: Session = Depends(get_db)):
    return db.query(Transfer).filter(Transfer.status == 'pending').all()

@router.get('/transfer/all')
def get_all_transfers(db: Session = Depends(get_db)):
    transfers = db.query(Transfer).all()
    result = []
    for t in transfers:
        transfer_dict = {
            'id': t.id,
            'source_warehouse_id': t.source_warehouse_id,
            'destination_warehouse_id': t.destination_warehouse_id,
            'consumer_id': t.consumer_id,
            'transfer_type': t.transfer_type,
            'drug_id': t.drug_id,
            'expire_date': t.expire_date,
            'transfer_date': t.transfer_date,
            'quantity_sent': t.quantity_sent,
            'quantity_received': t.quantity_received,
            'status': t.status,
            'created_at': t.created_at,
            'confirmed_at': t.confirmed_at,
            # Add related objects
            'source_warehouse': {'id': t.source_warehouse.id, 'name': t.source_warehouse.name} if t.source_warehouse else None,
            'destination_warehouse': {'id': t.destination_warehouse.id, 'name': t.destination_warehouse.name} if t.destination_warehouse else None,
            'consumer': {'id': t.consumer.id, 'name': t.consumer.name} if t.consumer else None,
            'drug': {'id': t.drug.id, 'name': t.drug.name, 'dose': t.drug.dose} if t.drug else None
        }
        result.append(transfer_dict)
    return result

@router.get('/transit/inventory')
def get_transit_inventory(db: Session = Depends(get_db)):
    """
    دریافت موجودی انبار کالای در راه (TRANSIT)
    فقط برای مدیریت و نظارت سیستم
    """
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        return []
    
    return db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id
    ).order_by(Inventory.expire_date.asc()).all()

@router.put('/transfer/{transfer_id}/confirm')
def confirm_transfer_by_id(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """تایید حواله با شناسه - تایید کامل با quantity_sent"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    # Check destination warehouse access for warehousemen
    if transfer.transfer_type == 'warehouse':
        if not check_warehouse_access(current_user, transfer.destination_warehouse_id):
            raise HTTPException(status_code=403, detail="شما فقط می‌توانید حواله‌های ورودی به انبار خود را تایید کنید")
    
    if transfer.status != 'pending':
        raise HTTPException(status_code=400, detail="فقط حواله‌های در انتظار قابل تایید هستند")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Deduct from transit
    inv_transit = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if not inv_transit or inv_transit.quantity < transfer.quantity_sent:
        raise HTTPException(status_code=400, detail="موجودی کالای در راه کافی نیست")
    
    inv_transit.quantity -= transfer.quantity_sent
    
    # Add to destination warehouse (only for warehouse transfers)
    if transfer.transfer_type == 'warehouse':
        inv_dest = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.destination_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_dest:
            inv_dest.quantity += transfer.quantity_sent
        else:
            inv_dest = Inventory(
                warehouse_id=transfer.destination_warehouse_id,
                drug_id=transfer.drug_id,
                expire_date=transfer.expire_date,
                quantity=transfer.quantity_sent,
                supplier_id=inv_transit.supplier_id if inv_transit.supplier_id else 1
            )
            db.add(inv_dest)
    
    transfer.status = 'confirmed'
    transfer.quantity_received = transfer.quantity_sent
    transfer.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.commit()
    
    log_operation(db, "Confirm Transfer", f"تایید حواله شماره {transfer_id}")
    return transfer

@router.put('/transfer/{transfer_id}/reject')
def reject_transfer_by_id(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """رد حواله با شناسه - برگشت از کالای در راه به انبار مبدا"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    # Check destination warehouse access for warehousemen
    if transfer.transfer_type == 'warehouse':
        if not check_warehouse_access(current_user, transfer.destination_warehouse_id):
            raise HTTPException(status_code=403, detail="شما فقط می‌توانید حواله‌های ورودی به انبار خود را رد کنید")
    
    if transfer.status != 'pending':
        raise HTTPException(status_code=400, detail="فقط حواله‌های در انتظار قابل رد هستند")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Deduct from transit
    inv_transit = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if not inv_transit or inv_transit.quantity < transfer.quantity_sent:
        raise HTTPException(status_code=400, detail="موجودی کالای در راه کافی نیست")
    
    inv_transit.quantity -= transfer.quantity_sent
    
    # Return to source warehouse
    inv_source = db.query(Inventory).filter(
        Inventory.warehouse_id == transfer.source_warehouse_id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if inv_source:
        inv_source.quantity += transfer.quantity_sent
    else:
        inv_source = Inventory(
            warehouse_id=transfer.source_warehouse_id,
            drug_id=transfer.drug_id,
            expire_date=transfer.expire_date,
            quantity=transfer.quantity_sent,
            supplier_id=inv_transit.supplier_id if inv_transit.supplier_id else 1
        )
        db.add(inv_source)
    
    transfer.status = 'rejected'
    transfer.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.commit()
    
    log_operation(db, "Reject Transfer", f"رد حواله شماره {transfer_id}")
    return transfer

@router.delete('/transfer/{transfer_id}')
def delete_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """حذف حواله - برگشت از کالای در راه به مبدا"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    if transfer.status in ['confirmed', 'rejected']:
        raise HTTPException(status_code=400, detail="حواله تایید یا رد شده قابل حذف نیست")
    
    # Only creator can delete (or admin/superadmin)
    if current_user.access_level not in ['admin', 'superadmin']:
        if transfer.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="فقط صادرکننده حواله می‌تواند آن را حذف کند")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # If pending, return from transit to source
    if transfer.status == 'pending':
        # Deduct from transit
        inv_transit = db.query(Inventory).filter(
            Inventory.warehouse_id == transit_wh.id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_transit and inv_transit.quantity >= transfer.quantity_sent:
            inv_transit.quantity -= transfer.quantity_sent
        
        # Return to source
        inv_source = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.source_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_source:
            inv_source.quantity += transfer.quantity_sent
        else:
            inv_source = Inventory(
                warehouse_id=transfer.source_warehouse_id,
                drug_id=transfer.drug_id,
                expire_date=transfer.expire_date,
                quantity=transfer.quantity_sent,
                supplier_id=inv_transit.supplier_id if inv_transit and inv_transit.supplier_id else 1
            )
            db.add(inv_source)
    
    db.delete(transfer)
    db.commit()
    
    log_operation(db, "Delete Transfer", f"حذف حواله شماره {transfer_id}")
    return {"message": "حواله حذف شد"}

# Mismatch management endpoints
@router.get('/transfer/mismatches')
def get_mismatch_transfers(db: Session = Depends(get_db)):
    """دریافت لیست حواله‌های مغایرت‌دار"""
    return db.query(Transfer).filter(Transfer.status == 'mismatch').all()

@router.post('/mismatch/resolve')
def resolve_mismatch(
    transfer_id: int,
    action: str,  # 'delete', 'return_source', 'add_destination'
    notes: str = "",
    db: Session = Depends(get_db)
):
    """
    حل مغایرت کالاهای در راه
    action: 'delete' (حذف از موجودی), 'return_source' (عودت به مبدا), 'add_destination' (اضافه به مقصد)
    """
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="حواله یافت نشد")
    
    if transfer.status != 'mismatch':
        raise HTTPException(status_code=400, detail="فقط حواله‌های مغایرت‌دار قابل حل هستند")
    
    # Get transit warehouse
    transit_wh = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
    if not transit_wh:
        raise HTTPException(status_code=500, detail="انبار کالای در راه یافت نشد")
    
    # Calculate mismatch quantity
    mismatch_qty = transfer.quantity_sent - transfer.quantity_received
    
    if mismatch_qty <= 0:
        raise HTTPException(status_code=400, detail="مقدار مغایرت صفر یا منفی است")
    
    # Get transit inventory
    inv_transit = db.query(Inventory).filter(
        Inventory.warehouse_id == transit_wh.id,
        Inventory.drug_id == transfer.drug_id,
        Inventory.expire_date == transfer.expire_date
    ).first()
    
    if not inv_transit or inv_transit.quantity < mismatch_qty:
        raise HTTPException(status_code=400, detail="موجودی مغایرت در کالای در راه کافی نیست")
    
    # Deduct mismatch from transit
    inv_transit.quantity -= mismatch_qty
    
    if action == 'delete':
        # Just remove from transit (already done above)
        log_msg = f"Mismatch {mismatch_qty} deleted from inventory. Notes: {notes}"
    
    elif action == 'return_source':
        # Return to source warehouse
        inv_source = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.source_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_source:
            inv_source.quantity += mismatch_qty
        else:
            inv_source = Inventory(
                warehouse_id=transfer.source_warehouse_id,
                drug_id=transfer.drug_id,
                expire_date=transfer.expire_date,
                quantity=mismatch_qty,
                supplier_id=inv_transit.supplier_id
            )
            db.add(inv_source)
        
        log_msg = f"Mismatch {mismatch_qty} returned to source warehouse. Notes: {notes}"
    
    elif action == 'add_destination':
        # Add to destination warehouse
        if transfer.transfer_type != 'warehouse':
            raise HTTPException(status_code=400, detail="فقط حواله‌های انبار به انبار می‌توانند به مقصد اضافه شوند")
        
        inv_dest = db.query(Inventory).filter(
            Inventory.warehouse_id == transfer.destination_warehouse_id,
            Inventory.drug_id == transfer.drug_id,
            Inventory.expire_date == transfer.expire_date
        ).first()
        
        if inv_dest:
            inv_dest.quantity += mismatch_qty
        else:
            inv_dest = Inventory(
                warehouse_id=transfer.destination_warehouse_id,
                drug_id=transfer.drug_id,
                expire_date=transfer.expire_date,
                quantity=mismatch_qty,
                supplier_id=inv_transit.supplier_id
            )
            db.add(inv_dest)
        
        log_msg = f"Mismatch {mismatch_qty} added to destination warehouse. Notes: {notes}"
    
    else:
        raise HTTPException(status_code=400, detail="عملیات نامعتبر است")
    
    # Update transfer status to resolved
    transfer.status = 'resolved'
    transfer.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    db.commit()
    log_operation(db, "Resolve Mismatch", log_msg)
    
    return {"message": "مغایرت با موفقیت حل شد", "action": action, "quantity": mismatch_qty}

# Operation logs
# ... (implement endpoint to fetch logs)

@router.get('/inventory/report')
def get_inventory_report(
    warehouse_id: Optional[int] = None,
    drug_id: Optional[int] = None,
    expire_date_from: Optional[str] = None,
    expire_date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Inventory).filter(Inventory.is_disposed == False)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    if drug_id:
        query = query.filter(Inventory.drug_id == drug_id)
    if expire_date_from:
        query = query.filter(Inventory.expire_date >= expire_date_from)
    if expire_date_to:
        query = query.filter(Inventory.expire_date <= expire_date_to)
    
    # Return inventory with drug info for has_expiry_date filtering in frontend
    results = []
    for inv in query.all():
        results.append({
            'id': inv.id,
            'warehouse_id': inv.warehouse_id,
            'drug_id': inv.drug_id,
            'expire_date': inv.expire_date,
            'quantity': inv.quantity,
            'supplier_id': inv.supplier_id,
            'entry_date': inv.entry_date,
            'has_expiry_date': inv.drug.has_expiry_date if inv.drug else True  # Include drug's expiry flag
        })
    return results

@router.get('/export-excel')
def export_excel(
    warehouse_id: Optional[int] = None,
    drug_id: Optional[int] = None,
    expire_date_from: Optional[str] = None,
    expire_date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Inventory).filter(Inventory.is_disposed == False)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    if drug_id:
        query = query.filter(Inventory.drug_id == drug_id)
    if expire_date_from:
        query = query.filter(Inventory.expire_date >= expire_date_from)
    if expire_date_to:
        query = query.filter(Inventory.expire_date <= expire_date_to)
        
    inventory = query.all()
    data = [{
        'انبار': inv.warehouse.name,
        'دارو': inv.drug.name,
        'تاریخ انقضا': inv.expire_date,
        'تعداد': inv.quantity
    } for inv in inventory]
    df = pd.DataFrame(data)
    file_path = 'inventory_export.xlsx'
    df.to_excel(file_path, index=False)
    return FileResponse(file_path, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename=file_path)

@router.get('/export-pdf')
def export_pdf(
    warehouse_id: Optional[int] = None,
    drug_id: Optional[int] = None,
    expire_date_from: Optional[str] = None,
    expire_date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    
    # Build query with filters
    query = db.query(Inventory).filter(Inventory.is_disposed == False)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    if drug_id:
        query = query.filter(Inventory.drug_id == drug_id)
    if expire_date_from:
        query = query.filter(Inventory.expire_date >= expire_date_from)
    if expire_date_to:
        query = query.filter(Inventory.expire_date <= expire_date_to)
        
    inventory = query.all()
    
    # Register Persian font
    font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'Vazirmatn-Regular.ttf')
    pdfmetrics.registerFont(TTFont('Vazirmatn', font_path))
    
    # Helper function to prepare Persian text
    def prepare_persian_text(text):
        if not text:
            return ""
        reshaped_text = arabic_reshaper.reshape(str(text))
        bidi_text = get_display(reshaped_text)
        return bidi_text
    
    # Helper function to get color based on expiry date
    def get_expiry_color(expire_date):
        if not expire_date:
            return colors.grey
        try:
            exp_date = datetime.strptime(str(expire_date), '%Y-%m-%d')
            days_until = (exp_date - datetime.now()).days
            if days_until < 0:
                return colors.Color(0.8, 0, 0)  # Dark red - expired
            elif days_until < 30:
                return colors.Color(1, 0.2, 0.2)  # Red
            elif days_until < 90:
                return colors.Color(1, 0.6, 0)  # Orange
            else:
                return colors.Color(0.2, 0.7, 0.2)  # Green
        except:
            return colors.grey
    
    # Create PDF
    file_path = 'inventory_export.pdf'
    doc = SimpleDocTemplate(file_path, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    # Story container
    story = []
    
    # Create custom styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Vazirmatn',
        fontSize=18,
        textColor=colors.HexColor('#1976d2'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontName='Vazirmatn',
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    # Add title
    title_text = prepare_persian_text("گزارش موجودی انبار دارویی")
    story.append(Paragraph(title_text, title_style))
    
    # Add date and time in Persian (Jalali)
    now = datetime.now()
    jalali_now = jdatetime.datetime.fromgregorian(datetime=now)
    current_date = jalali_now.strftime('%Y/%m/%d')
    current_time = now.strftime('%H:%M')
    date_text = prepare_persian_text(f"تاریخ: {current_date} - ساعت: {current_time}")
    story.append(Paragraph(date_text, subtitle_style))
    
    story.append(Spacer(1, 0.5*cm))
    
    # Prepare table data
    table_data = []
    
    # Header row
    headers = [
        prepare_persian_text("تعداد"),
        prepare_persian_text("تاریخ انقضا"),
        prepare_persian_text("نام دارو"),
        prepare_persian_text("نام انبار"),
        prepare_persian_text("ردیف")
    ]
    table_data.append(headers)
    
    # Data rows
    for idx, inv in enumerate(inventory, 1):
        row = [
            prepare_persian_text(str(inv.quantity)),
            str(inv.expire_date) if inv.expire_date else "-",
            prepare_persian_text(inv.drug.name),
            prepare_persian_text(inv.warehouse.name),
            str(idx)
        ]
        table_data.append(row)
    
    # Create table
    table = Table(table_data, colWidths=[3*cm, 3.5*cm, 5*cm, 5*cm, 2*cm])
    
    # Table style with colors
    table_style = [
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Vazirmatn'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows styling
        ('FONTNAME', (0, 1), (-1, -1), 'Vazirmatn'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]
    
    # Add expiry date colors
    for idx, inv in enumerate(inventory, 1):
        exp_color = get_expiry_color(inv.expire_date)
        table_style.append(('TEXTCOLOR', (1, idx), (1, idx), exp_color))
        table_style.append(('FONTNAME', (1, idx), (1, idx), 'Vazirmatn'))
    
    table.setStyle(TableStyle(table_style))
    story.append(table)
    
    # Add summary footer
    story.append(Spacer(1, 1*cm))
    
    total_items = len(inventory)
    total_quantity = sum(inv.quantity for inv in inventory)
    summary_text = prepare_persian_text(f"تعداد کل اقلام: {total_items} | مجموع تعداد: {total_quantity}")
    
    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontName='Vazirmatn',
        fontSize=10,
        textColor=colors.HexColor('#1976d2'),
        alignment=TA_CENTER,
        borderWidth=1,
        borderColor=colors.HexColor('#1976d2'),
        borderPadding=10,
        backColor=colors.HexColor('#e3f2fd')
    )
    story.append(Paragraph(summary_text, summary_style))
    
    # Build PDF
    doc.build(story)
    
    return FileResponse(file_path, media_type='application/pdf', filename='inventory_export.pdf')

# User Management Endpoints
@router.get('/users')
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "access_level": u.access_level,
            "warehouses": [w.id for w in u.warehouses]
        })
    return result

@router.post('/users')
def add_user(data: dict, db: Session = Depends(get_db)):
    # Convert username to lowercase for case-insensitive storage
    username_lower = data['username'].lower()
    
    if db.query(User).filter(User.username == username_lower).first():
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")
    
    user = User(
        username=username_lower,
        password=pwd_context.hash(data['password']),
        full_name=data.get('full_name'),
        access_level=data.get('access_level', 'viewer')
    )
    
    if 'warehouses' in data and isinstance(data['warehouses'], list):
        warehouses = db.query(Warehouse).filter(Warehouse.id.in_(data['warehouses'])).all()
        user.warehouses = warehouses

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put('/users/{user_id}')
def update_user(
    user_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    # Prevent editing superadmin
    if user.username == 'superadmin':
        raise HTTPException(status_code=400, detail="امکان ویرایش مدیر کل وجود ندارد")
    
    # Password change restrictions for 'admin' user
    if 'password' in data and data['password'] and user.username == 'admin':
        # Only superadmin or admin himself can change admin password
        if current_user.username != 'superadmin' and current_user.username != 'admin':
            raise HTTPException(
                status_code=403, 
                detail="فقط سوپر ادمین یا خود ادمین می‌تواند رمز ادمین را تغییر دهد"
            )
    
    if 'password' in data and data['password']:
        user.password = pwd_context.hash(data['password'])
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'access_level' in data:
        user.access_level = data['access_level']
    
    if 'warehouses' in data and isinstance(data['warehouses'], list):
        warehouses = db.query(Warehouse).filter(Warehouse.id.in_(data['warehouses'])).all()
        user.warehouses = warehouses
        
    db.commit()
    db.refresh(user)
    return user

@router.delete('/users/{user_id}')
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    if user.username == 'superadmin':
        raise HTTPException(status_code=400, detail="امکان حذف مدیر کل وجود ندارد")
    if user.username == 'admin':
        raise HTTPException(status_code=400, detail="امکان حذف کاربر ادمین وجود ندارد")
        
    db.delete(user)
    db.commit()
    return {"message": "کاربر با موفقیت حذف شد"}

@router.post('/change-password')
def change_password(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    # Extract user from token - users can only change their own password
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get('sub')
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current user and update their password
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    # Verify old password
    if 'old_password' not in data or not data['old_password']:
        raise HTTPException(status_code=400, detail="رمز عبور قبلی الزامی است")
    
    if not pwd_context.verify(data['old_password'], user.password):
        raise HTTPException(status_code=400, detail="رمز عبور قبلی اشتباه است")
    
    # Update to new password
    user.password = pwd_context.hash(data['new_password'])
    db.commit()
    return {"message": "رمز عبور با موفقیت تغییر یافت"}

@router.get('/settings')
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).all()
    return {s.key: s.value for s in settings}

@router.post('/settings')
def update_settings(data: dict, db: Session = Depends(get_db)):
    for key, value in data.items():
        setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            setting = SystemSettings(key=key, value=str(value))
            db.add(setting)
    db.commit()
    return {"message": "تنظیمات ذخیره شد"}

@router.get('/inventory/{inventory_id}/used')
def check_inventory_used(inventory_id: int, db: Session = Depends(get_db)):
    inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    # Check if any transfer exists for this drug/warehouse/expiry combination
    transfer = db.query(Transfer).filter(
        Transfer.source_warehouse_id == inventory.warehouse_id,
        Transfer.drug_id == inventory.drug_id,
        Transfer.expire_date == inventory.expire_date
    ).first()
    
    return {"used": transfer is not None}

# Permission Management
@router.get('/permissions')
def get_all_permissions(db: Session = Depends(get_db)):
    """دریافت لیست تمام دسترسی‌های موجود"""
    return db.query(Permission).all()

@router.post('/permissions')
def create_permission(data: dict, db: Session = Depends(get_db)):
    """ایجاد دسترسی جدید"""
    if db.query(Permission).filter(Permission.name == data['name']).first():
        raise HTTPException(status_code=400, detail="این دسترسی قبلاً ایجاد شده")
    
    perm = Permission(
        name=data['name'],
        description=data.get('description', '')
    )
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm

@router.get('/users/{user_id}/permissions')
def get_user_permissions(user_id: int, db: Session = Depends(get_db)):
    """دریافت دسترسی‌های یک کاربر"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    return [{"id": p.id, "name": p.name, "description": p.description} for p in user.permissions]

@router.post('/users/{user_id}/permissions')
def assign_permissions_to_user(user_id: int, permission_ids: list, db: Session = Depends(get_db)):
    """تخصیص دسترسی‌ها به کاربر"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    user.permissions = permissions
    db.commit()
    
    return {"message": "دسترسی‌ها با موفقیت تخصیص داده شد"}

@router.delete('/users/{user_id}/permissions/{permission_id}')
def remove_permission_from_user(user_id: int, permission_id: int, db: Session = Depends(get_db)):
    """حذف یک دسترسی از کاربر"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if permission in user.permissions:
        user.permissions.remove(permission)
        db.commit()
        return {"message": "دسترسی حذف شد"}
    
    raise HTTPException(status_code=404, detail="این دسترسی برای کاربر وجود ندارد")

