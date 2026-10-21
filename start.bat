@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Start production server
echo ============================================
echo.

if not exist "server\dist\server.js" (
  echo [INFO] No production build found, building now...
  call npm run build
  if errorlevel 1 (
    echo [ERROR] Build failed.
    exit /b 1
  )
)

if not exist "server\.env" (
  copy /y "server\.env.example" "server\.env" >nul
  echo [OK] Created server\.env from the example file.
)

echo [OK] Serving the app on http://localhost:5000
echo.
call npm run start --workspace=server
