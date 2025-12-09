import uvicorn
import socket
import os
import sys

def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def run_migrations():
    """Run database migrations before starting server"""
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    sys.path.insert(0, backend_dir)
    
    try:
        print("[*] Running database migrations...")
        from migrate_db import migrate
        migrate()
        print("[+] Migrations completed\n")
    except Exception as e:
        print(f"[!] Migration warning: {e}\n")

if __name__ == "__main__":
    # Run migrations first
    run_migrations()
    
    # Change directory to backend to ensure imports work
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    if os.path.exists(backend_dir):
        sys.path.append(backend_dir)
        os.chdir(backend_dir)
    
    ip_address = get_ip_address()
    port = 8000
    
    print("="*50)
    print(f"Starting Pharmacy Warehouse Server...")
    print(f"Local Access: http://localhost:{port}")
    print(f"Network Access: http://{ip_address}:{port}")
    print("="*50)
    print("Logs will be shown below:")
    
    # Run Uvicorn
    # reload=True is good for development, but for a stable "run script" maybe False is better?
    # The user asked for a script to run the server, implying production-like or stable run.
    # But reload is useful if they are still editing. I'll leave it on for now or make it optional.
    # Using "main:app" assumes main.py has the app object.
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
