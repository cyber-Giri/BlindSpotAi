@echo off
cd /d "%~dp0"
echo ========================================================
echo Starting BlindSpot AI Backend on http://127.0.0.1:8000
echo ========================================================
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
