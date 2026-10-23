@echo off
echo [stop] Stopping NEXORA API server...
taskkill /F /IM node.exe >nul 2>&1
echo [stop] Done.
pause
