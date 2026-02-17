@echo off
echo ============================================
echo   Meeting Scheduler Agent - Local Server
echo ============================================
echo.
echo   Opening http://127.0.0.1:8000 ...
echo   Press CTRL+C to stop the server.
echo.
start http://127.0.0.1:8000
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
pause
