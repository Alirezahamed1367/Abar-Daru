import os

print("__file__:", __file__)
print("dirname(__file__):", os.path.dirname(__file__))
print("dirname(dirname(__file__)):", os.path.dirname(os.path.dirname(__file__)))

build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'build')
static_path = os.path.join(build_path, "static")

print("\nbuild_path:", build_path)
print("static_path:", static_path)
print("build exists:", os.path.exists(build_path))
print("static exists:", os.path.exists(static_path))

if os.path.exists(build_path):
    print("✅ Build path found!")
    print("Contents:", os.listdir(build_path))
else:
    print("❌ Build path not found!")
