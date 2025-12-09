@echo off
REM Test install_service.bat requirements
echo ==========================================
echo Testing Service Installation Requirements
echo ==========================================

REM Test 1: Check Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [FAIL] Not running as Administrator
    echo Please run this test as Administrator
    pause
    exit /b 1
) else (
    echo [PASS] Administrator privileges OK
)

REM Test 2: Check NSSM exists
SET PROJECT_PATH=%~dp0
SET PROJECT_PATH=%PROJECT_PATH:~0,-1%
if exist "%PROJECT_PATH%\nssm.exe" (
    echo [PASS] nssm.exe found
) else (
    echo [FAIL] nssm.exe not found
)

REM Test 3: Check Python
where python >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('where python') do set PYTHON_PATH=%%i
    echo [PASS] Python found: %PYTHON_PATH%
) else (
    echo [FAIL] Python not found in PATH
)

REM Test 4: Check Python version
python --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do echo [PASS] %%i
) else (
    echo [FAIL] Cannot get Python version
)

REM Test 5: Check run_server.py exists
if exist "%PROJECT_PATH%\run_server.py" (
    echo [PASS] run_server.py found
) else (
    echo [FAIL] run_server.py not found
)

REM Test 6: Check if service already exists
sc query PharmacyWarehouse >nul 2>&1
if %errorLevel% equ 0 (
    echo [WARN] Service already exists - will be removed during installation
) else (
    echo [PASS] Service does not exist - ready for fresh installation
)

echo ==========================================
echo Test Complete!
echo ==========================================
echo.
echo If all tests passed, you can run install_service.bat
pause
