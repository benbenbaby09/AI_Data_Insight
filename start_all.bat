@echo off
echo Starting AI Data Insight Services...

:: Start Backend
echo Starting Backend...
start "AI Data Insight Backend" cmd /k "python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
echo Starting Frontend...
cd frontend\frontend
start "AI Data Insight Frontend" cmd /k "npm run dev"

echo Services started!
