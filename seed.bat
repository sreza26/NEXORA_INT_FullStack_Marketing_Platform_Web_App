@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - Seed the local database
echo ============================================
echo.

if not exist "server\.env" (
  if exist "server\.env.example" (
    copy /y "server\.env.example" "server\.env" >nul
    echo [OK] Created server\.env from the example file.
  ) else (
    echo [ERROR] server\.env.example is missing.
    exit /b 1
  )
)

set FORCE_RESET=1
call npm run db:reset --workspace=server
if errorlevel 1 (
  echo [ERROR] Could not reset the database.
  exit /b 1
)

call npm run db:seed --workspace=server
if errorlevel 1 (
  echo [ERROR] Could not seed the database.
  exit /b 1
)

echo.
echo [OK] Database ready.
echo     Admin login: admin@nexora.test / Password123!
echo     Member login: leader@nexora.test / Password123!
echo.
pause
