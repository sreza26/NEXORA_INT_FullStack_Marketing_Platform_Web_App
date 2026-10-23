@echo off
cd /d "%~dp0"
title NEXORA Server

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

if not exist node_modules\package.json (
    echo [start] Installing dependencies...
    call npm install --no-audit --no-fund
)

if not exist client\dist (
    echo [start] Building client production assets...
    call npm run build --workspace @nexora/client
)

if not exist server\dist\server.js (
    echo [start] Building server...
    call npm run build --workspace @nexora/server
)

node -e "const fs=require('fs');fs.mkdirSync('backups',{recursive:true});const f='backups/last-maintenance.txt';const today=new Date().toISOString().slice(0,10);let last='1970-01-01';try{last=fs.readFileSync(f,'utf8').trim().split(/\r?\n/)[0]||last}catch{};const days=(Date.now()-new Date(last).getTime())/86400000;if(days>=90){console.log('');console.log('--------------------------------------------------------');console.log('  SYSTEM MAINTENANCE DUE');console.log('  Please review database, backups and logs.');console.log('--------------------------------------------------------')}fs.writeFileSync(f,today)"

echo [start] Starting NEXORA API server on http://localhost:5000
echo [start] Press Ctrl+C or run Server_Stop.bat to stop it.
echo.
node app.js
echo.
echo [start] Server stopped.
pause
