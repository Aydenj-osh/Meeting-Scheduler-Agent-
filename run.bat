@echo off
echo Starting Meeting Scheduler Server...
echo Open http://127.0.0.1:8000 in your browser.
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
pause
