@echo off
REM Uninstall Pharmacy Warehouse Windows Service

REM Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click on the file and select "Run as administrator"
    pause
    exit /b 1
)

SET SERVICE_NAME=PharmacyWarehouse
SET PROJECT_PATH=%~dp0
SET PROJECT_PATH=%PROJECT_PATH:~0,-1%

echo ==========================================
echo Uninstalling Pharmacy Warehouse Service
echo ==========================================

REM Check if NSSM exists
if not exist "%PROJECT_PATH%\nssm.exe" (
    echo ERROR: nssm.exe not found!
    pause
    exit /b 1
)

REM Stop service
echo Stopping service...
"%PROJECT_PATH%\nssm.exe" stop %SERVICE_NAME%
timeout /t 2 /nobreak >nul

REM Remove service
echo Removing service...
"%PROJECT_PATH%\nssm.exe" remove %SERVICE_NAME% confirm

echo ==========================================
echo Service uninstalled successfully!
echo ==========================================
pause
