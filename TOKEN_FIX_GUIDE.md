# راهنمای حل مشکل خطای توکن احراز هویت

## علت مشکل
هنگام دسترسی از شبکه (IP: 178.63.160.203:8000)، مرورگر کلاینت ممکن است **نسخه قدیمی فایل‌های JavaScript** را از cache لود کند که شامل کد interceptor جدید نیست.

## راه‌حل‌های فوری (برای کاربر)

### گزینه 1: پاک کردن Cache مرورگر
1. کلیدهای `Ctrl + Shift + Delete` را فشار دهید
2. گزینه "Cached images and files" را انتخاب کنید
3. روی "Clear data" کلیک کنید
4. صفحه را رفرش کنید (`F5`)

### گزینه 2: Hard Refresh
1. صفحه را با `Ctrl + Shift + R` رفرش کنید
2. یا `Ctrl + F5` را فشار دهید

### گزینه 3: حالت Incognito
1. پنجره Incognito باز کنید (`Ctrl + Shift + N` در Chrome)
2. به آدرس `http://178.63.160.203:8000` بروید
3. لاگین کنید

## راه‌حل دائمی (برای سرور)

### مرحله 1: Deploy Build جدید
```
کلیک راست روی deploy_and_restart.bat → Run as administrator
```

این اسکریپت:
- Frontend را build می‌کند
- سرویس را restart می‌کند (اگر نصب شده باشد)

### مرحله 2: بررسی Build
1. به پوشه `frontend\build\static\js` بروید
2. فایل `main.*.js` را پیدا کنید
3. تاریخ آن باید امروز باشد

### مرحله 3: بررسی index.html
1. فایل `frontend\build\index.html` را باز کنید
2. مطمئن شوید که به همان فایل JS اشاره می‌کند

## بررسی عملکرد

### از Developer Tools:
1. `F12` را فشار دهید
2. به تب **Network** بروید
3. صفحه را رفرش کنید
4. فایل `main.*.js` را پیدا کنید
5. بررسی کنید که:
   - Status: `200` (نه `304 Not Modified`)
   - Size: حجم واقعی (نه `from disk cache`)

### از Console:
1. `F12` → تب **Console**
2. دستور زیر را اجرا کنید:
```javascript
localStorage.getItem('token')
```
3. باید یک token نمایش داده شود

## اگر مشکل همچنان ادامه دارد

### بررسی کنید:
1. آیا فایل `main.827e2c8f.js` در `frontend\build\static\js` وجود دارد؟
2. آیا سرور restart شده است؟
3. آیا مرورگر cache را پاک کرده‌اید؟

### لاگ‌های مفید:
- سرور: `logs\service_output.log`
- مرورگر: F12 → Console → Network

## تغییرات اعمال شده

### 1. فایل `index.js`
- Axios interceptor به صورت global اضافه شد
- همه درخواست‌ها اکنون token را خودکار ارسال می‌کنند

### 2. فایل `main.py`
- Header‌های Cache-Control اضافه شدند
- مرورگر مجبور می‌شود نسخه جدید را لود کند

### 3. فایل Build
- آخرین build: `main.827e2c8f.js` (327.04 KB)
- تاریخ: 2025-12-08 05:57:24
- شامل تمام تغییرات authentication

## پشتیبانی
اگر پس از انجام تمام مراحل فوق، مشکل همچنان وجود دارد:
1. Screenshot از خطا بگیرید
2. Console log را کپی کنید
3. به مدیر سیستم گزارش دهید
