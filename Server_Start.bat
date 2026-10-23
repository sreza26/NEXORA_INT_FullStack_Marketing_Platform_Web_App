@echo off
setlocal

cd /d "%~dp0"

:: Ensure Node.js exists
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: Create .env.local if missing so local testing uses localhost DB
if not exist server\.env.local (
    echo [start] Creating server/.env.local for localhost testing...
    echo NODE_ENV=development >> server\.env.local
    echo PORT=5000 >> server\.env.local
    echo APP_URL=http://localhost:5000 >> server\.env.local
    echo CLIENT_ORIGIN=http://localhost:5173 >> server\.env.local
    echo. >> server\.env.local
    echo DB_HOST=localhost >> server\.env.local
    echo DB_PORT=3306 >> server\.env.local
    echo DB_NAME=nexora_local >> server\.env.local
    echo DB_USER=root >> server\.env.local
    echo DB_PASSWORD=root >> server\.env.local
    echo DB_SSL=false >> server\.env.local
    echo DB_POOL_LIMIT=10 >> server\.env.local
    echo. >> server\.env.local
    echo APP_KEY=base64:dev-local-key-do-not-use-in-production== >> server\.env.local
    echo ENCRYPTION_KEY=base64:dev-local-key-do-not-use-in-production== >> server\.env.local
    echo JWT_SECRET=dev-local-jwt-secret-do-not-use-in-production >> server\.env.local
    echo JWT_EXPIRES_IN=7d >> server\.env.local
    echo BCRYPT_ROUNDS=10 >> server\.env.local
    echo CURRENCY=USD >> server\.env.local
    echo MEMBER_CODE_PREFIX=NX >> server\.env.local
    echo MEMBER_CODE_LENGTH=8 >> server\.env.local
    echo DEVELOPER_PASSWORD=NexoraDev@2026! >> server\.env.local
)

:: Auto-install dependencies if node_modules is missing
if not exist node_modules\package.json (
    echo [start] Installing dependencies...
    npm install
)

:: Build production assets if client/dist is missing
if not exist client\dist (
    echo [start] Building production assets...
    npm run build
)

:: Ensure server build exists
if not exist server\dist\server.js (
    echo [start] Building server...
    npm run build --workspace @nexora/server
)

echo [start] Starting Node.js server detached on http://localhost:5000
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'app.js' -WorkingDirectory '%~dp0'"
echo [start] Started. Use Server_Stop.bat to stop the server.
endlocal
