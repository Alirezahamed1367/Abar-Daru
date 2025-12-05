from database import init_db
from models import User
from database import SessionLocal
from passlib.context import CryptContext

# Initialize database
print("Creating database...")
init_db()

# Create default users
db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if not db.query(User).filter(User.username == "superadmin").first():
    user = User(username="superadmin", password=pwd_context.hash("A25893Aa"), full_name="Super Admin", access_level="superadmin")
    db.add(user)
    print("Created superadmin user")

if not db.query(User).filter(User.username == "admin").first():
    user = User(username="admin", password=pwd_context.hash("admin"), full_name="Admin", access_level="admin")
    db.add(user)
    print("Created admin user")

db.commit()
db.close()
print("✅ Database initialized successfully!")
