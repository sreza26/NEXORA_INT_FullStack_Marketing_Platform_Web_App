@echo off
cd /d "%~dp0"

:: ── Node.js required ───────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: ── 1. Local .env.override if missing (fast local testing) ──────
if not exist server\.env.local (
    echo [start] Creating server/.env.local for localhost testing...
    (
      echo NODE_ENV=development
      echo PORT=5000
      echo APP_URL=http://localhost:5000
      echo CLIENT_ORIGIN=http://localhost:5173
      echo DB_HOST=localhost
      echo DB_PORT=3306
      echo DB_NAME=nexora_local
      echo DB_USER=root
      echo DB_PASSWORD=root
      echo DB_SSL=false
      echo DB_POOL_LIMIT=10
      echo APP_KEY=base64:dev-local-key-do-not-use-in-production==
      echo ENCRYPTION_KEY=base64:dev-local-key-do-not-use-in-production==
      echo JWT_SECRET=dev-local-jwt-secret-do-not-use-in-production
      echo JWT_EXPIRES_IN=7d
      echo BCRYPT_ROUNDS=10
      echo CURRENCY=USD
      echo MEMBER_CODE_PREFIX=NX
      echo MEMBER_CODE_LENGTH=8
      echo DEVELOPER_PASSWORD=NexoraDev@2026!
    ) > server\.env.local
)

:: ── 2. Install dependencies if missing ──────────────────────────
if not exist node_modules\package.json (
    echo [start] Installing dependencies...
    npm install
)

:: ── 3. Build client & server if assets are missing ──────────────
if not exist client\dist (
    echo [start] Building client production assets...
    npm run build --workspace @nexora/client
)
if not exist server\dist\server.js (
    echo [start] Building server...
    npm run build --workspace @nexora/server
)

:: ── 4. 3-month system maintenance banner ────────────────────────
powershell -NoProfile -Command "$f='backups\last-maintenance.txt'; if(-not(Test-Path $f)){Set-Content $f ((Get-Date)-Format 'yyyy-MM-dd')}; $l=Get-Content $f -ErrorAction SilentlyContinue | Select-Object -First 1; if($l){$i=[datetimeoffset]::Parse($l)}; $r=([datetimeoffset]::Now)-$i.ToUniversalTime(); if($r.TotalDays -ge 90){Write-Host ''; Write-Host ('-'*56); Write-Host '  SYSTEM MAINTENANCE DUE'; Write-Host '  Please review database, backups and logs.'; Write-Host ('-'*56)}; Set-Content $f ((Get-Date)-Format 'yyyy-MM-dd')"

:: ── 5. Start API server in this window (stays alive until Enter) ─
echo [start] Starting NEXORA API server on http://localhost:5000
echo [start] Press Ctrl+C or run Server_Stop.bat to stop it.
echo [start] Building server...
node app.js
pause
