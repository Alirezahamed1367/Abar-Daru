"""
Migration: Add image_data column to drugs table
تبدیل تصاویر موجود به Base64 و ذخیره در دیتابیس
"""
import sqlite3
import base64
import os

def migrate():
    conn = sqlite3.connect('pharmacy.db')
    cursor = conn.cursor()
    
    # Add image_data column if not exists
    try:
        cursor.execute("ALTER TABLE drugs ADD COLUMN image_data TEXT")
        print("✅ ستون image_data به جدول drugs اضافه شد")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("ℹ️  ستون image_data قبلاً وجود داشت")
        else:
            raise
    
    # Convert existing images to Base64
    cursor.execute("SELECT id, image FROM drugs WHERE image IS NOT NULL AND image != ''")
    drugs = cursor.fetchall()
    
    converted = 0
    for drug_id, image_path in drugs:
        if os.path.exists(image_path):
            try:
                with open(image_path, 'rb') as f:
                    img_bytes = f.read()
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                img_data = f"data:image/jpeg;base64,{img_base64}"
                
                cursor.execute("UPDATE drugs SET image_data = ? WHERE id = ?", (img_data, drug_id))
                converted += 1
                print(f"✅ تصویر دارو {drug_id} به Base64 تبدیل شد ({len(img_bytes)} bytes)")
            except Exception as e:
                print(f"❌ خطا در تبدیل تصویر دارو {drug_id}: {e}")
        else:
            print(f"⚠️  فایل تصویر دارو {drug_id} یافت نشد: {image_path}")
    
    conn.commit()
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"✅ Migration completed successfully!")
    print(f"📊 {converted} تصویر به Base64 تبدیل شد")
    print(f"{'='*60}")

if __name__ == "__main__":
    migrate()
