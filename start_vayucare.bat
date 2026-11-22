@echo off
title VayuCare AI Launcher
echo ========================================================
echo           Starting VayuCare AI Application
echo ========================================================
echo.
echo [1/2] Launching Backend API Server (Port 3001)...
start "VayuCare Backend (Port 3001)" /min cmd /c "cd /d %~dp0server && node index.js"

echo [2/2] Launching Frontend Development Server (Port 5173)...
start "VayuCare Frontend (Port 5173)" /min cmd /c "cd /d %~dp0 && npm run dev"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo   VayuCare AI is now running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   (Keep the minimized server windows open while using)
echo ========================================================
