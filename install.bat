@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Install dependencies
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH. Install Node.js 22 or newer and try again.
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js !NODE_VERSION!

call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed. Check your internet connection and try again.
  exit /b 1
)

echo.
echo [OK] Dependencies installed.
echo     Next: run seed.bat to create the database, then dev.bat to start.
echo.
pause
