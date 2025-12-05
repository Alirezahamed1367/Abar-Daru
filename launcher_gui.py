import tkinter as tk
from tkinter import scrolledtext
import threading
import uvicorn
import sys
import socket
import os
import webbrowser
import time
import logging

# Add backend to path so we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

class RedirectText(object):
    def __init__(self, text_ctrl):
        self.output = text_ctrl
        self.encoding = "utf-8"

    def write(self, string):
        self.output.insert(tk.END, string)
        self.output.see(tk.END)

    def flush(self):
        pass
    
    def isatty(self):
        return False

class ServerThread(threading.Thread):
    def __init__(self, config):
        threading.Thread.__init__(self)
        self.server = uvicorn.Server(config=config)
        self.daemon = True

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True

def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class AppLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("Pharmacy Warehouse Server Launcher")
        self.root.geometry("700x500")

        # Info Label
        self.info_label = tk.Label(root, text="Pharmacy Warehouse System", font=("Helvetica", 16, "bold"))
        self.info_label.pack(pady=10)

        # IP Address Info
        self.local_ip = get_ip_address()
        self.port = 8000
        self.url_local = f"http://localhost:{self.port}"
        self.url_network = f"http://{self.local_ip}:{self.port}"

        status_text = f"🟢 Ready to start\n📍 Local: {self.url_local}\n🌐 Network: {self.url_network}\n💡 Frontend: Build files from /frontend/build"
        self.status_label = tk.Label(root, text=status_text, font=("Consolas", 9), justify=tk.LEFT, bg="#f0f0f0", relief=tk.RIDGE, padx=10, pady=5)
        self.status_label.pack(pady=5, fill=tk.X, padx=10)

        # Buttons Frame
        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=10)

        self.start_btn = tk.Button(btn_frame, text="Start Server", command=self.start_server, bg="green", fg="white", width=15)
        self.start_btn.pack(side=tk.LEFT, padx=10)

        self.open_browser_btn = tk.Button(btn_frame, text="Open Browser", command=self.open_browser, state=tk.DISABLED, width=15)
        self.open_browser_btn.pack(side=tk.LEFT, padx=10)

        self.stop_btn = tk.Button(btn_frame, text="Stop Server", command=self.stop_server, bg="red", fg="white", state=tk.DISABLED, width=15)
        self.stop_btn.pack(side=tk.LEFT, padx=10)

        # Log Area with Copy Button
        log_frame = tk.Frame(root)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        log_label_frame = tk.Frame(log_frame)
        log_label_frame.pack(fill=tk.X)
        
        tk.Label(log_label_frame, text="Server Logs:", font=("Helvetica", 10, "bold")).pack(side=tk.LEFT, padx=5)
        
        copy_btn = tk.Button(log_label_frame, text="📋 Copy Logs", command=self.copy_logs, bg="#4CAF50", fg="white")
        copy_btn.pack(side=tk.RIGHT, padx=5)
        
        clear_btn = tk.Button(log_label_frame, text="🗑️ Clear Logs", command=self.clear_logs, bg="#FF9800", fg="white")
        clear_btn.pack(side=tk.RIGHT, padx=5)
        
        self.log_area = scrolledtext.ScrolledText(log_frame, state='normal', height=15, wrap=tk.WORD)
        self.log_area.pack(fill=tk.BOTH, expand=True, pady=(5, 0))
        
        # Redirect stdout/stderr
        sys.stdout = RedirectText(self.log_area)
        sys.stderr = RedirectText(self.log_area)

        self.server_thread = None

    def start_server(self):
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        self.open_browser_btn.config(state=tk.NORMAL)
        
        print("="*60)
        print("🚀 Starting Pharmacy Warehouse Server...")
        print("="*60)
        
        try:
            # Try to import app from backend.main (preferred), then main, then load from backend/main.py dynamically.
            try:
                from backend.main import app
            except Exception:
                try:
                    from main import app
                except Exception:
                    # Fallback: load backend/main.py directly by path
                    import importlib.util
                    backend_path = os.path.join(os.path.dirname(__file__), 'backend', 'main.py')
                    spec = importlib.util.spec_from_file_location("backend.main", backend_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    app = getattr(module, 'app')
            
            # Configure logging manually
            config = uvicorn.Config(app, host="0.0.0.0", port=self.port, log_level="info", log_config=None)
            
            # Setup uvicorn logger to print to our redirected stdout
            logger = logging.getLogger("uvicorn")
            logger.setLevel(logging.INFO)
            logger.handlers = []
            
            ch = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            ch.setFormatter(formatter)
            logger.addHandler(ch)
            
            # Also setup uvicorn.error and uvicorn.access
            logger_access = logging.getLogger("uvicorn.access")
            logger_access.handlers = []
            logger_access.addHandler(ch)
            logger_access.setLevel(logging.INFO)

            logger_error = logging.getLogger("uvicorn.error")
            logger_error.handlers = []
            logger_error.addHandler(ch)
            logger_error.setLevel(logging.INFO)

            self.server_thread = ServerThread(config)
            self.server_thread.start()
            
            print("\n" + "="*60)
            print(f"✅ Server is running!")
            print(f"📍 Local Access: {self.url_local}")
            print(f"🌐 Network Access: {self.url_network}")
            print(f"📁 Serving Frontend: /frontend/build")
            print(f"⚠️  Note: To see latest code changes, rebuild frontend:")
            print(f"   cd frontend && npm run build")
            print("="*60 + "\n")
        except Exception as e:
            print(f"❌ Error starting server: {e}")
            import traceback
            traceback.print_exc()
            self.stop_server()

    def stop_server(self):
        if self.server_thread:
            print("\n" + "="*60)
            print("🛑 Stopping server...")
            self.server_thread.stop()
            self.server_thread = None
            print("✅ Server stopped successfully.")
            print("="*60 + "\n")
        
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.open_browser_btn.config(state=tk.DISABLED)

    def open_browser(self):
        webbrowser.open(self.url_local)
    
    def copy_logs(self):
        """کپی کردن لاگ‌ها به کلیپ‌بورد"""
        log_content = self.log_area.get('1.0', tk.END)
        self.root.clipboard_clear()
        self.root.clipboard_append(log_content)
        self.root.update()
        print("✅ Logs copied to clipboard!")
    
    def clear_logs(self):
        """پاک کردن لاگ‌ها"""
        self.log_area.delete('1.0', tk.END)
        print("🗑️ Logs cleared.")

    def on_closing(self):
        if self.server_thread:
            self.server_thread.stop()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = AppLauncher(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
