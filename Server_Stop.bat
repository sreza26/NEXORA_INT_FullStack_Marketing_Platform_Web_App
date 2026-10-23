@echo off
setlocal
echo [stop] Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo [stop] Done.
endlocal
