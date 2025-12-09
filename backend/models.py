from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, Boolean, Table, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Association table for User-Warehouse (Many-to-Many)
user_warehouses = Table('user_warehouses', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('warehouse_id', Integer, ForeignKey('warehouses.id'))
)

# Association table for User-Permission (Many-to-Many)
user_permissions = Table('user_permissions', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # e.g., 'view_inventory', 'edit_drugs', 'manage_users'
    description = Column(String)  # Human-readable description

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    access_level = Column(String, default='warehouseman')  # Still keep for legacy support
    warehouses = relationship('Warehouse', secondary=user_warehouses, back_populates='users')
    permissions = relationship('Permission', secondary=user_permissions, backref='users')

class Warehouse(Base):
    __tablename__ = 'warehouses'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    address = Column(String)
    manager = Column(String)
    is_virtual = Column(Boolean, default=False)  # True for system warehouses like TRANSIT
    users = relationship('User', secondary=user_warehouses, back_populates='warehouses')

class SystemSettings(Base):
    __tablename__ = 'system_settings'
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)

class Supplier(Base):
    __tablename__ = 'suppliers'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    address = Column(String)

class Consumer(Base):
    __tablename__ = 'consumers'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String)
    description = Column(Text)

class Drug(Base):
    __tablename__ = 'drugs'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    dose = Column(String)
    package_type = Column(String)
    image = Column(String)  # Path to cached file (images/drug_X.jpg)
    image_data = Column(Text)  # Base64 encoded image data for backup
    description = Column(Text)
    has_expiry_date = Column(Boolean, default=True)  # True: requires expiry date, False: no expiry needed

class Inventory(Base):
    __tablename__ = 'inventory'
    __table_args__ = (
        UniqueConstraint('warehouse_id', 'drug_id', 'expire_date', name='uq_inventory_warehouse_drug_expiry'),
    )
    id = Column(Integer, primary_key=True)
    warehouse_id = Column(Integer, ForeignKey('warehouses.id'))
    drug_id = Column(Integer, ForeignKey('drugs.id'))
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=True)
    expire_date = Column(String, nullable=True)  # YYYY-MM format, nullable for non-expiry drugs
    entry_date = Column(String, nullable=True) # Jalali YYYY/MM/DD
    quantity = Column(Integer, default=0)
    is_disposed = Column(Boolean, default=False)  # True if disposed/destroyed, excluded from reports
    warehouse = relationship('Warehouse')
    drug = relationship('Drug')
    supplier = relationship('Supplier')

class OperationLog(Base):
    __tablename__ = 'operation_logs'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String)
    details = Column(Text)
    timestamp = Column(String)
    user = relationship('User')

class Transfer(Base):
    __tablename__ = 'transfers'
    id = Column(Integer, primary_key=True)
    source_warehouse_id = Column(Integer, ForeignKey('warehouses.id'))
    destination_warehouse_id = Column(Integer, ForeignKey('warehouses.id'), nullable=True)
    consumer_id = Column(Integer, ForeignKey('consumers.id'), nullable=True)
    transfer_type = Column(String, default='warehouse') # 'warehouse', 'consumer', or 'disposal'
    drug_id = Column(Integer, ForeignKey('drugs.id'))
    expire_date = Column(String, nullable=True)  # YYYY-MM format, nullable for non-expiry drugs
    transfer_date = Column(String, nullable=True) # Jalali YYYY/MM/DD
    quantity_sent = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    status = Column(String, default='pending')  # pending, confirmed, mismatch
    created_by = Column(String, nullable=True)  # username of creator
    created_at = Column(String)
    confirmed_at = Column(String)
    source_warehouse = relationship('Warehouse', foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship('Warehouse', foreign_keys=[destination_warehouse_id])
    consumer = relationship('Consumer')
    drug = relationship('Drug')
