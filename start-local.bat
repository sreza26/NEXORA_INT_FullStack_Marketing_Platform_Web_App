@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Start local environment
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH. Please install Node.js 22+ and rerun.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [INFO] Using Node.js !NODE_VER!

if not exist "node_modules" (
  echo [INFO] node_modules not found. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
  echo [OK] Dependencies installed.
) else (
  echo [OK] Dependencies found.
)

if not exist "server\.env" (
  if exist "server\.env.example" (
    copy /y "server\.env.example" "server\.env" >nul
    echo [OK] Created server\.env from example.
  )
)

if not exist "server\database\nexora.sqlite" (
  echo [INFO] Database not found. Seeding database...
  call npm run db:reset --workspace=server >nul 2>&1
  call npm run db:seed --workspace=server
  if errorlevel 1 (
    echo [ERROR] Database seeding failed.
    pause
    exit /b 1
  )
  echo [OK] Database seeded.
  echo      Admin: admin@nexora.test / Password123!
  echo      Member: leader@nexora.test / Password123!
) else (
  echo [OK] Database found.
)

echo.
echo [INFO] Starting NEXORA (API: http://localhost:5000 ^| App: http://localhost:5173)
echo [INFO] Opening browser in 5 seconds...
echo.

start "" cmd /c "timeout /t 5 >nul && start http://localhost:5173"

call npm run dev

endlocal
