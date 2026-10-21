@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Development servers
echo ============================================
echo.
echo   API  : http://localhost:5000
echo   App  : http://localhost:5173
echo.

if not exist "node_modules" (
  echo [ERROR] Dependencies are missing. Run install.bat first.
  exit /b 1
)

call npm run dev
