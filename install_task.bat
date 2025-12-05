@echo off
REM Create Windows Task Scheduler task for Pharmacy Warehouse
REM This will start the server automatically when Windows boots

SET TASK_NAME=PharmacyWarehouseServer
SET PYTHON_PATH=C:\Users\Administrator\AppData\Local\Programs\Python\Python314\python.exe
SET PROJECT_PATH=D:\Hamed\Project\Anbar-Daru
SET RUN_SCRIPT=%PROJECT_PATH%\run_server.py

echo ==========================================
echo Creating Scheduled Task
echo ==========================================

REM Delete existing task if exists
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

REM Create new task
schtasks /Create /TN "%TASK_NAME%" /TR "\"%PYTHON_PATH%\" \"%RUN_SCRIPT%\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F

if %ERRORLEVEL% EQU 0 (
    echo ==========================================
    echo Task created successfully!
    echo Task Name: %TASK_NAME%
    echo ==========================================
    echo.
    echo The server will start automatically when Windows boots.
    echo.
    echo To manage the task:
    echo - Start manually: schtasks /Run /TN "%TASK_NAME%"
    echo - Stop: Use Task Manager to end python.exe process
    echo - Remove: schtasks /Delete /TN "%TASK_NAME%" /F
    echo.
    echo Starting task now...
    schtasks /Run /TN "%TASK_NAME%"
) else (
    echo ERROR: Failed to create task!
    echo Please run this script as Administrator.
)

pause
