@echo off
REM Uninstall Pharmacy Warehouse Service

SET SERVICE_NAME=PharmacyWarehouse
SET PROJECT_PATH=D:\Hamed\Project\Anbar-Daru

echo ==========================================
echo Uninstalling Pharmacy Warehouse Service
echo ==========================================

if not exist "%PROJECT_PATH%\nssm.exe" (
    echo ERROR: nssm.exe not found!
    pause
    exit /b 1
)

echo Stopping service...
"%PROJECT_PATH%\nssm.exe" stop %SERVICE_NAME%

echo Removing service...
"%PROJECT_PATH%\nssm.exe" remove %SERVICE_NAME% confirm

echo ==========================================
echo Service uninstalled successfully!
echo ==========================================
pause
