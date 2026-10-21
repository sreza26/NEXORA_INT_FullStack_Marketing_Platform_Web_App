@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo  NEXORA - API smoke test
echo ============================================
echo.

if not exist "node_modules" (
  echo [ERROR] Dependencies are missing. Run install.bat first.
  exit /b 1
)

call npm run test --workspace=server
if errorlevel 1 (
  echo.
  echo [ERROR] Smoke test failed.
  exit /b 1
)

echo.
echo [OK] Smoke test passed.
echo.
pause
