import os
import sys

# Simulate what happens in main.py
current_file = os.path.abspath(__file__)
print(f"Current file: {current_file}")

backend_dir = os.path.dirname(current_file)
print(f"Backend dir: {backend_dir}")

project_dir = os.path.dirname(backend_dir)
print(f"Project dir: {project_dir}")

build_path = os.path.join(project_dir, 'frontend', 'build')
static_path = os.path.join(build_path, "static")

print(f"\nBuild path: {build_path}")
print(f"Static path: {static_path}")

print(f"\nChecking paths:")
print(f"  os.path.exists(build_path): {os.path.exists(build_path)}")
print(f"  os.path.exists(static_path): {os.path.exists(static_path)}")

condition = os.path.exists(build_path) and os.path.exists(static_path)
print(f"\nCondition (build_path exists AND static_path exists): {condition}")

if condition:
    print("✅ Would mount static files and serve React app")
else:
    print("❌ Would show 'Frontend build not found' message")
