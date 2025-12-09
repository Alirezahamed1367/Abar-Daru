@echo off
REM Deploy new build and restart server
echo ==========================================
echo Deploying Frontend Build and Restarting Server
echo ==========================================

SET PROJECT_PATH=%~dp0
SET PROJECT_PATH=%PROJECT_PATH:~0,-1%
SET SERVICE_NAME=PharmacyWarehouse

echo.
echo Step 1: Building frontend...
cd "%PROJECT_PATH%\frontend"
call npm run build
if %errorLevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Checking if service exists...
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    echo Service exists. Restarting...
    net session >nul 2>&1
    if %errorLevel% neq 0 (
        echo ERROR: Need Administrator privileges to restart service!
        echo Please run this script as Administrator
        pause
        exit /b 1
    )
    
    "%PROJECT_PATH%\nssm.exe" restart %SERVICE_NAME%
    echo Service restarted successfully!
) else (
    echo Service not installed. You can start server manually with:
    echo python run_server.py
)

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo If you're accessing from network, please:
echo 1. Clear browser cache (Ctrl+Shift+Delete)
echo 2. Hard refresh the page (Ctrl+Shift+R)
echo 3. Or use incognito mode
echo.
pause
