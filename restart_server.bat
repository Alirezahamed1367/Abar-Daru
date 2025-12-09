@echo off
REM Quick Server Restart Script
echo ==========================================
echo Restarting Pharmacy Warehouse Server
echo ==========================================

SET PROJECT_PATH=%~dp0
SET PROJECT_PATH=%PROJECT_PATH:~0,-1%
SET SERVICE_NAME=PharmacyWarehouse

echo.
echo Checking if service exists...
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    REM Service exists - restart it
    echo Service found. Checking permissions...
    net session >nul 2>&1
    if %errorLevel% neq 0 (
        echo.
        echo ERROR: Need Administrator privileges!
        echo Please run this script as Administrator
        echo.
        pause
        exit /b 1
    )
    
    echo Restarting service...
    "%PROJECT_PATH%\nssm.exe" restart %SERVICE_NAME%
    
    if %errorLevel% equ 0 (
        echo.
        echo ==========================================
        echo Service restarted successfully!
        echo ==========================================
        echo.
        echo Please tell network users to:
        echo 1. Clear browser cache (Ctrl+Shift+Delete)
        echo 2. Hard refresh (Ctrl+Shift+R)
        echo 3. Or use incognito mode
        echo.
    ) else (
        echo.
        echo ERROR: Failed to restart service!
        echo.
    )
) else (
    REM Service not installed - check if server is running
    echo Service not installed.
    echo.
    echo Checking for running Python processes...
    tasklist /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *run_server*" >nul 2>&1
    
    if %errorLevel% equ 0 (
        echo Found running Python server. Attempting to stop...
        taskkill /F /FI "WINDOWTITLE eq *run_server*" /FI "IMAGENAME eq python.exe"
        timeout /t 2 /nobreak >nul
    )
    
    echo Starting server manually...
    echo.
    echo Opening new window for server...
    start "Pharmacy Server" python "%PROJECT_PATH%\run_server.py"
    
    timeout /t 3 /nobreak >nul
    echo.
    echo ==========================================
    echo Server started in new window
    echo ==========================================
    echo.
    echo Please tell network users to:
    echo 1. Clear browser cache (Ctrl+Shift+Delete)
    echo 2. Hard refresh (Ctrl+Shift+R)
    echo 3. Or use incognito mode
    echo.
)

pause
