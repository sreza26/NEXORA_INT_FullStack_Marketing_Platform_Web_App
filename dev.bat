@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH. Install Node.js 20 or newer.
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    exit /b 1
  )
)

if not exist "server\.env" (
  if exist "server\.env.example" (
    copy /y "server\.env.example" "server\.env" >nul
    echo [OK] Created server\.env from the example file.
  ) else (
    echo [ERROR] server\.env is missing.
    exit /b 1
  )
)

echo.
echo ============================================
echo  NEXORA - Development
echo ============================================
echo  The API starts first, then the client.
echo  App: http://localhost:5173
echo.

call npm run dev
