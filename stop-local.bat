@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Stop local servers
echo ============================================
echo.

echo [INFO] Terminating Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.cmd >nul 2>&1
taskkill /F /IM vite.cmd >nul 2>&1

timeout /t 2 >nul

echo [OK] All NEXORA local servers have been stopped.
echo.
pause
endlocal
