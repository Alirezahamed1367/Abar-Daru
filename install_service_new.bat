@echo off
REM Install Pharmacy Warehouse as Windows Service using NSSM
REM Download NSSM from: https://nssm.cc/download

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
SET RUN_SCRIPT=%PROJECT_PATH%\run_server.py

REM Auto-detect Python path
echo Detecting Python installation...
for /f "tokens=*" %%i in ('where python') do set PYTHON_PATH=%%i
if "%PYTHON_PATH%"=="" (
    echo ERROR: Python not found in PATH!
    echo Please install Python and add it to system PATH
    pause
    exit /b 1
)
echo Found Python: %PYTHON_PATH%

echo ==========================================
echo Installing Pharmacy Warehouse Service
echo ==========================================
echo Service Name: %SERVICE_NAME%
echo Project Path: %PROJECT_PATH%
echo Python Path:  %PYTHON_PATH%
echo ==========================================
echo.

REM Check if NSSM exists
if not exist "%PROJECT_PATH%\nssm.exe" (
    echo ERROR: nssm.exe not found!
    echo Please download NSSM from: https://nssm.cc/download
    echo Extract nssm.exe 64-bit version to: %PROJECT_PATH%
    echo.
    pause
    exit /b 1
)

REM Remove service if exists
echo Removing existing service if any...
"%PROJECT_PATH%\nssm.exe" stop %SERVICE_NAME% >nul 2>&1
"%PROJECT_PATH%\nssm.exe" remove %SERVICE_NAME% confirm >nul 2>&1

REM Install service
echo Installing service...
"%PROJECT_PATH%\nssm.exe" install %SERVICE_NAME% "%PYTHON_PATH%" "%RUN_SCRIPT%"

REM Configure service
echo Configuring service...
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% AppDirectory "%PROJECT_PATH%"
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% DisplayName "Pharmacy Warehouse Server"
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% Description "FastAPI server for pharmacy warehouse management system"
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% AppStdout "%PROJECT_PATH%\logs\service_output.log"
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% AppStderr "%PROJECT_PATH%\logs\service_error.log"
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% AppRotateFiles 1
"%PROJECT_PATH%\nssm.exe" set %SERVICE_NAME% AppRotateBytes 1048576

REM Create logs directory
if not exist "%PROJECT_PATH%\logs" mkdir "%PROJECT_PATH%\logs"

REM Start service
echo Starting service...
"%PROJECT_PATH%\nssm.exe" start %SERVICE_NAME%

echo ==========================================
echo Service installed successfully!
echo Service Name: %SERVICE_NAME%
echo Status: Running
echo Logs: %PROJECT_PATH%\logs\
echo ==========================================
echo.
echo The server will now start automatically when Windows boots.
echo.
echo To manage the service:
echo - Start:   nssm start %SERVICE_NAME%
echo - Stop:    nssm stop %SERVICE_NAME%
echo - Restart: nssm restart %SERVICE_NAME%
echo - Remove:  nssm remove %SERVICE_NAME% confirm
echo.
pause
