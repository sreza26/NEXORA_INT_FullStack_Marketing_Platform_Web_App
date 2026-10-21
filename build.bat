@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Production build
echo ============================================
echo.

if not exist "node_modules" (
  echo [ERROR] Dependencies are missing. Run install.bat first.
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  exit /b 1
)

if not exist "client\dist\index.html" (
  echo [ERROR] client\dist\index.html was not produced.
  exit /b 1
)

if not exist "server\dist\server.js" (
  echo [ERROR] server\dist\server.js was not produced.
  exit /b 1
)

echo.
echo [OK] Build complete.
echo     client\dist\index.html
echo     server\dist\server.js
echo.
pause
