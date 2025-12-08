from database import SessionLocal
from models import User, Warehouse

db = SessionLocal()
user = db.query(User).filter(User.username == 'test2').first()

print('Warehouses assigned to test2:')
for w in user.warehouses:
    print(f'  - ID: {w.id}, Name: {w.name}')

print('\nAll warehouses in database:')
all_wh = db.query(Warehouse).all()
for w in all_wh:
    print(f'  - ID: {w.id}, Name: {w.name}')

db.close()
