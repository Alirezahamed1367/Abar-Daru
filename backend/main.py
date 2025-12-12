from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api import router
from database import SessionLocal, init_db
from models import User, Warehouse
from passlib.context import CryptContext
import os

app = FastAPI()

# Ensure images directory exists and use absolute path
images_path = os.path.join(os.path.dirname(__file__), 'images')
if not os.path.exists(images_path):
    os.makedirs(images_path)
app.mount("/images", StaticFiles(directory=images_path), name="images")

# Test page for debugging
@app.get("/test")
async def serve_test_page():
    test_file = os.path.join(os.path.dirname(__file__), 'test-simple.html')
    if os.path.exists(test_file):
        return FileResponse(test_file)
    return {"error": "Test page not found"}

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simple local network access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
def create_default_users():
    init_db()
    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Create superadmin if not exists
    if not db.query(User).filter(User.username == "superadmin").first():
        user = User(username="superadmin", password=pwd_context.hash("A25893Aa"), full_name="Super Admin", access_level="superadmin")
        db.add(user)
    
    # Create admin if not exists
    if not db.query(User).filter(User.username == "admin").first():
        user = User(username="admin", password=pwd_context.hash("admin"), full_name="Admin", access_level="admin")
        db.add(user)
    
    # Create TRANSIT warehouse if not exists
    if not db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first():
        transit_warehouse = Warehouse(
            name="کالای در راه",
            code="TRANSIT",
            address="انبار مجازی سیستم",
            manager="سیستم",
            is_virtual=True
        )
        db.add(transit_warehouse)
        print("✅ انبار TRANSIT (کالای در راه) به عنوان انبار مجازی ایجاد شد")
    else:
        # Make sure existing TRANSIT is marked as virtual
        transit = db.query(Warehouse).filter(Warehouse.code == "TRANSIT").first()
        if not transit.is_virtual:
            transit.is_virtual = True
            print("✅ انبار TRANSIT به عنوان انبار مجازی علامت‌گذاری شد")
    
    db.commit()
    db.close()

# Serve React App
build_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'build')
static_path = os.path.join(build_path, "static")

if os.path.exists(build_path) and os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If the path starts with /api, it should have been handled by the router.
        # If we are here, it means it's a 404 for API or a frontend route.
        if full_path.startswith("api/"):
             return {"error": "API endpoint not found"}
        
        # Check if file exists in build folder (e.g. manifest.json, favicon.ico)
        file_path = os.path.join(build_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            response = FileResponse(file_path)
            # Prevent caching for HTML files
            if full_path.endswith('.html') or full_path == '':
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
            return response
            
        # Otherwise return index.html for SPA routing
        response = FileResponse(os.path.join(build_path, "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
else:
    @app.get('/')
    def read_root():
        return {"message": "Pharmacy Warehouse API is running. Frontend build not found."}

