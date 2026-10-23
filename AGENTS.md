# NEXORA — Full Project Prompt for AI Agents & Vibe Coders

> **How to use this file**
> Paste this file into an AI coding agent's context (or keep it at the repo root as
> `AGENTS.md`). It contains the project map, domain rules, conventions, commands,
> guardrails and verification steps needed to make correct changes without
> re-discovering the codebase.
>
> **Project root:** `D:\AI_CODING\NEXORA_FullStack_TS` (Windows, PowerShell 5.1)
> **Production domain:** `https://nexoraint.net`
> **Runtime:** Node.js ≥ 20 (ESM), MySQL/MariaDB

---

## 1. What this app is

NEXORA is a **multi-level marketing / network management platform** with:

- Member registration, sponsor/referral trees and closure tables
- Identity verification (KYC documents)
- Business transactions (purchases) and verified volume
- Generation commissions with approval/payment workflow
- Rank progression, rank requirements and rank reports
- Monthly salary payouts by rank
- Travel/reward catalogue and reward claims
- Double-entry wallet ledger, deposits and withdrawal requests
- Reconciliation between wallet balances and ledger sums
- Announcements, notifications, audit logs and scheduled job runs
- Admin console (finance, compliance, support, super admin, developer)
- Public marketing site + member portal + admin portal + developer panel

The current codebase is a TypeScript rewrite of an older Laravel app. A legacy
SQLite database can optionally be imported with
`server/scripts/import-laravel.ts` (destructive; requires confirmation).

---

## 2. Tech stack (do not swap casually)

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 7, Vite 6, TypeScript, Tailwind CSS 4, Chart.js, lucide-react, axios |
| Backend | Node.js ESM, Express 4, TypeScript, Zod 4, JWT (`jsonwebtoken`), bcryptjs |
| Database | MySQL / MariaDB via `mysql2/promise` (no SQLite at runtime) |
| Shared | `shared/` workspace with shared TypeScript types |
| Deployment | Hostinger shared hosting, Phusion Passenger entry `app.js`, static client build |

Key runtime packages:
- `express-async-errors` (must stay the **first import** in `server/src/app.ts`)
- `helmet`, `cors`, `compression`
- `mysql2`, `zod`, `bcryptjs`, `jsonwebtoken`, `dotenv`

---

## 3. Repository map

```
/
├─ app.js                     # Passenger/production entry -> imports server/dist/server.js
├─ package.json               # npm workspaces: client, server, shared
├─ Server_Start.bat           # Windows launcher (checks deps, builds, starts node app.js)
├─ Server_Stop.bat            # Kills node.exe
├─ docker-compose.yml         # Optional local MySQL 8 on port 3306
├─ scripts/
│  ├─ dev.mjs                 # Starts API, waits for /health, then starts Vite
│  └─ db-backup.mjs           # mysqldump -> backups/nexora-YYYY-MM-DD.sql
├─ shared/                    # Shared types/utilities (build before server/client)
├─ client/
│  ├─ vite.config.ts          # Dev proxy /api -> http://127.0.0.1:5000
│  ├─ dist/                   # Built SPA served by Express in production
│  └─ src/
│     ├─ App.tsx              # All routes
│     ├─ main.tsx
│     ├─ lib/api.ts           # axios instance, token header, helpers
│     ├─ lib/auth.ts         # auth context + hasPermission
│     ├─ components/          # Shell, ChartCanvas, shared UI
│     └─ pages/               # public/, auth/, member/, admin/
└─ server/
   ├─ .env / .env.local       # Runtime secrets/config (gitignored; never commit)
   ├─ .env.example            # Template (production/Hostinger values)
   ├─ .env.local.example      # Template for localhost testing
   ├─ database/               # Legacy SQLite artifacts (unused at runtime)
   ├─ storage/uploads/        # Private uploads (e.g. KYC docs)
   ├─ scripts/
   │  ├─ seed.ts
   │  ├─ reset-db.ts
   │  ├─ smoke-test.ts
   │  └─ import-laravel.ts
   └─ src/
      ├─ server.ts            # await seed(); createApp(); listen
      ├─ app.ts               # middleware, /health, /api, static client, errors
      ├─ config/index.ts      # env config (loads .env then .env.local override)
      ├─ config/permissions.ts# PERMISSION_CATALOGUE + ROLE_PERMISSION_MATRIX
      ├─ db/index.ts          # mysql2 pool, adapter, migrate(), transaction()
      ├─ db/seed.ts           # roles, permissions, ranks, plans, demo data, developer
      ├─ routes/              # auth, member, admin, developer, public
      ├─ controllers/         # thin HTTP layer (Zod validation -> services)
      ├─ services/            # domain logic (admin, commission, rank, reward, tree, withdrawal, closure)
      ├─ models/              # user, permissions, ledger
      ├─ middlewares/         # auth, permissions, error, rateLimit, upload
      └─ utils/               # crypto, errors, storage, xlsx
```

---

## 4. Request flow & layering

```
React page -> client/src/lib/api.ts (axios, Bearer JWT)
           -> Vite proxy /api -> http://127.0.0.1:5000
           -> server/src/app.ts
           -> routes/*
           -> authenticate -> requireRole / requirePermission
           -> Zod validation in controller
           -> services/* (domain logic)
           -> db/index.ts prepared statements / transaction()
           -> MySQL
```

Rules:
- **Controllers** parse/validate input and shape HTTP responses. Keep them thin.
- **Services** own business rules and multi-step DB work.
- **Models** contain reusable entity queries (users, permissions, ledger).
- Use `db.prepare(...).get/all/run` and the `transaction()` helper.
- All DB calls are **async** — always `await`.
- Use ESM `.js` extensions in TypeScript imports (e.g. `import { db } from '../db/index.js'`).

---

## 5. Domain model & business rules

### 5.1 Core entities / tables (34)

`users`, `roles`, `permissions`, `user_roles`, `permission_role`,
`permission_user`, `member_profiles`, `wallet_accounts`, `ledger_entries`,
`business_transactions`, `commissions`, `referral_edges`, `referral_closures`,
`ranks`, `rank_requirements`, `rank_achievements`, `member_rank_snapshots`,
`compensation_plans`, `compensation_plan_rates`, `salary_rules`,
`salary_periods`, `salary_payouts`, `rewards`, `reward_claims`, `deposits`,
`withdrawal_requests`, `reconciliation_records`, `notifications`,
`announcements`, `audit_logs`, `scheduled_job_runs`, `application_settings`,
`password_reset_tokens`, `email_verification_tokens`.

### 5.2 Referral network
- Each user may have a `sponsor_id`.
- `referral_edges` stores direct edges; `referral_closures` stores ancestor/descendant
  pairs with `depth` for fast downline queries.
- Rebuild closures with `rebuildAllReferralClosures()` from `services/closure.ts`.

### 5.3 Commissions
- A **verified/approved** business transaction generates commissions for the
  sponsor chain up to the active plan's generation limits.
- `compensation_plans` + `compensation_plan_rates` define rates per generation.
- Commission statuses: pending → approved → paid (or rejected).
- Paying a commission credits the recipient wallet and writes ledger entries.

### 5.4 Wallet & ledger
- The wallet balance is authoritative for display, but the ledger must reconcile
  to it.
- `ledger_entries` are double-entry style rows with `direction` (`credit`/`debit`).
- Every payout/credit/debit should write a ledger row (use existing services).
- `reconciliation_records` compares wallet balance vs ledger sum per member.

### 5.5 Withdrawals
- Member requests → admin approves/rejects → pays.
- Paying a withdrawal debits the wallet and writes a ledger entry.
- Config: min/max amount, hold days, enabled flag.

### 5.6 Ranks / salary / rewards
- `ranks` define levels, salaries and requirements.
- `rank_requirements` (e.g. `min_direct_links`, `downline_volume`) drive rank progress.
- Salary payouts are generated per period, then approved → paid.
- Rewards have codes, thresholds, budget, claim limits and claims workflow.

### 5.7 Demo data
- Demo users use `@demo.test`; demo transactions use `DEMO-*` references.
- `deleteDemoData()` / developer panel must only touch demo records.

---

## 6. Roles & permissions

Canonical roles:
`member`, `developer`, `super_admin`, `finance_admin`, `compliance_officer`,
`support_agent`.

- `super_admin` bypasses every permission check.
- `developer` also gets every permission plus access to `/api/developer/*`.
- `member` has no admin permissions.
- Permission catalogue and role matrix live in
  `server/src/config/permissions.ts`. **Never invent permission names** —
  add them to the catalogue and matrix, then re-seed.

Route guards:
- `authenticate` — verifies JWT, loads user + roles + permissions.
- `requireRole('developer', ...)` — role gate.
- `requirePermission('members.view')` — permission gate.
- `requireResolvedPermission(fn)` — dynamic permission (e.g. withdrawal action).
- Sensitive admin actions use the `sensitive` rate limiter (default 10/min).

---

## 7. Database rules (MySQL)

- Runtime driver is **mysql2/promise only**. Do not reintroduce `node:sqlite`.
- `server/src/db/index.ts` provides:
  - `db.prepare(sql).get/all/run(...)`
  - `db.exec(sql)`, `db.query(sql, params)`
  - `transaction(async () => { ... })` — uses `AsyncLocalStorage<PoolConnection>`
  - `migrate()`, `ensureColumn()`, `tableExists()`, `closeDb()`
  - `normalizeSql()` — compatibility layer for legacy SQLite syntax
    (`INSERT OR IGNORE/REPLACE`, `datetime('now')`, `ON CONFLICT`, backticked `key`,
    `DATE_ADD` modifiers)
- Prefer MySQL-native SQL for new queries. The normalizer is a safety net, not a
  target dialect.
- Use **parameter placeholders** (`?`) for values. Never interpolate user input.
- Use backticks for reserved identifiers such as `` `key` ``.
- Multi-step writes must use `transaction()`; do not nest transactions.
- `migrate()` is idempotent and retries transient network errors
  (`ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `PROTOCOL_CONNECTION_LOST`,
  `ER_CON_COUNT_ERROR`). It skips `CREATE TABLE` for existing tables.

### Schema version / seeding
- `server/src/db/seed.ts` has `SCHEMA_VERSION = '1'`.
- On boot, if `application_settings` contains
  `system.schema_version = SCHEMA_VERSION`, seeding is skipped (fast startup).
- **When you add a migration or required seed data, bump `SCHEMA_VERSION`.**
- First boot on an empty DB performs the full seed (roles, permissions, settings,
  ranks, plan, admin, demo network, rewards). Subsequent boots are fast.

### Scripts
```powershell
# Run from repo root; scripts live in the server workspace
npm run db:seed        --workspace @nexora/server
npm run db:reset       --workspace @nexora/server   # destructive; needs FORCE_RESET=1 + non-test env
npm run db:import-laravel --workspace @nexora/server
npm test               --workspace @nexora/server   # smoke test against current DB
```
`db:import-laravel` reads `LARAVEL_DB` or
`D:/AI_CODING/NEXORA_Marketing_Platform_Web_App/database/database.sqlite`,
disables foreign-key checks, replaces all data, and prints table count checks.
**Always confirm before running it.**

---

## 8. Backend conventions

- TypeScript strict; build with `tsc`.
- ESM with `.js` import extensions.
- `express-async-errors` must remain the first import in `app.ts`.
- Zod 4: use `error.issues` (not `error.errors`). Error middleware returns
  `422 { message, errors }`.
- HTTP errors: throw `HttpError(status, message)`.
- Business rule errors use `utils/errors.ts`.
- Auth: JWT in `Authorization: Bearer <token>`; `signToken` / `authenticate`.
- Passwords: `hashPassword` / `verifyPassword` (bcryptjs). Imported Laravel
  `$2y$` hashes are converted to `$2b$`.
- Uploads: `middlewares/upload.ts` + `utils/storage.ts`; KYC files are private and
  served through authenticated `/files/verification/...`.
- Audit sensitive actions with `svc.recordAudit(...)`.
- Do not log secrets or full tokens.

### Route files
- `routes/auth.ts` — register/login/me/password reset/email verification
- `routes/member.ts` — member portal
- `routes/admin.ts` — admin console (summary, members, transactions, ledger,
  deposits, withdrawals, reconciliation, plans, commissions, ranks, reports,
  salary, rewards, announcements, audit, jobs, settings)
- `routes/developer.ts` — overview, users, activity, demo data (developer only)
- `routes/public.ts` — public config/landing data

---

## 9. Frontend conventions

- React function components + hooks; no class components.
- Routes are declared in `client/src/App.tsx`.
- Use the shared axios instance from `client/src/lib/api.ts`
  (`api.get/post/...`); it attaches the token and base URL `/api`.
- Auth state via `client/src/lib/auth.ts`:
  `useAuth()`, `hasPermission(user, 'permission.name')`.
- Set page titles with `usePageTitle('Title')`.
- Layouts: `PublicLayout`, `GuestLayout`, `MemberLayout`, `AdminLayout`.
- Styling: Tailwind utility classes + shared classes (`page-title`, `card`,
  `btn`, `badge`, `data-table`, `stat-card`) in `styles/index.css`.
- Charts: `components/ChartCanvas.tsx` (Chart.js wrapper).
- Keep admin pages data-light: one request per page where possible; paginate lists.
- Vite dev proxy: `/api` → `http://127.0.0.1:5000`.
- Production: Express serves `client/dist`; unknown non-API routes fall back to
  `index.html`.

---

## 10. Commands

From the repo root:

```powershell
npm install                 # installs workspaces
npm run dev                 # API + Vite, waits for /health (scripts/dev.mjs)
npm run build               # shared -> client -> server
npm start                   # node app.js (production server on :5000)
npm run start:server        # server workspace start
```

Windows launchers:
```powershell
.\Server_Start.bat          # checks node, installs deps if missing, builds if missing,
                            # shows 90-day maintenance reminder, starts node app.js
.\Server_Stop.bat           # kills node.exe
```

Verification (run before declaring a backend change done):
```powershell
npx tsc --noEmit -p server/tsconfig.json
npm run build
```
Optionally run the smoke test against a **local** DB:
```powershell
npm test --workspace @nexora/server
```

---

## 11. Environment variables

Config is read by `server/src/config/index.ts`:
1. `server/.env`
2. `server/.env.local` (loaded second with `override: true`)

Never commit `.env` files. Use the templates:
- `server/.env.example` — production / Hostinger MySQL
- `server/.env.local.example` — localhost Docker MySQL

Key variables:
```
NODE_ENV, PORT, APP_URL, CLIENT_ORIGIN
JWT_SECRET, JWT_EXPIRES_IN
APP_KEY, ENCRYPTION_KEY
BCRYPT_ROUNDS
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, DB_POOL_LIMIT
CURRENCY, MEMBER_CODE_PREFIX, MEMBER_CODE_LENGTH
COMMISSION_ENABLED, COMMISSION_GENERATION, COMMISSION_RATES,
COMMISSION_GENERATION_RATES
WITHDRAWAL_ENABLED, WITHDRAWAL_MIN, WITHDRAWAL_MAX, WITHDRAWAL_HOLD_DAYS
SALARY_ENABLED, SALARY_DAY, REWARDS_ENABLED
SPONSOR_REQUIRED
DEVELOPER_PASSWORD   # used only when creating/converting the developer account
RATE_LIMIT_LOGIN, RATE_LIMIT_REGISTRATION, RATE_LIMIT_SENSITIVE, RATE_LIMIT_CONTACT
```

Security:
- Never print or commit secrets.
- Do not hardcode DB credentials or JWT keys.
- Do not expose KYC files without authentication.
- Do not add permissive CORS origins.

---

## 12. Local development (fast)

The remote Hostinger DB adds per-query latency; use local MySQL for speed.

```powershell
# 1. Start local MySQL (optional, requires Docker)
docker compose up -d

# 2. Create the local override
copy server\.env.local.example server\.env.local
# edit DB_* if needed; defaults: localhost:3306, root/root, nexora_local

# 3. Seed the local DB
npm run db:seed --workspace @nexora/server

# 4. Run
npm run dev
# or
.\Server_Start.bat
```

- `docker-compose.yml` runs MySQL 8 on `3306` with database `nexora_local`.
- `server/.env.local` overrides `server/.env` at runtime.
- **Do not leave a `.env.local` pointing at a stopped local MySQL** — the server
  will fail to start and the launcher window will exit.

Production/remote DB:
- Keep remote values in `server/.env` (or `.env.example` on the server).
- The app has been tested against MariaDB 11 with `DB_SSL=false`.

---

## 13. Production deployment (Hostinger)

1. Upload the repo (or pull it) to the hosting account.
2. `npm ci` (or `npm install`) at the repo root.
3. `npm run build` (shared → client → server).
4. Configure `server/.env` with Hostinger MySQL credentials, `NODE_ENV=production`,
   `APP_URL=https://nexoraint.net`, `CLIENT_ORIGIN=https://nexoraint.net,https://www.nexoraint.net`.
5. Passenger entry is `app.js` (`main` in root `package.json`), which imports
   `server/dist/server.js`.
6. Start/restart the app from hPanel. `npm start` runs `node app.js`.
7. The server serves the API and `client/dist`; ensure the build exists.

Startup:
- `server/src/server.ts` calls `await seed()` before listening.
- `seed()` calls `migrate()` unless the schema version is current.
- A cold first boot on a large remote DB can take ~50s; subsequent boots are ~5s.

---

## 14. Operations

### Windows launchers
- `Server_Start.bat`
  - verifies Node is installed
  - installs dependencies only if `node_modules/package.json` is missing
    (`npm install --no-audit --no-fund`)
  - builds client/server only if `client/dist` or `server/dist/server.js` is missing
  - checks `backups/last-maintenance.txt`; prints a reminder when ≥90 days old
  - runs `node app.js` in the visible console and pauses when it exits
- `Server_Stop.bat` — `taskkill /F /IM node.exe`, then pause.

### Backups
- `scripts/db-backup.mjs` dumps via `mysqldump` to
  `backups/nexora-YYYY-MM-DD.sql`.
- Requires `mysqldump` on `PATH`.
- Schedule daily with Windows Task Scheduler or cron.
- To push backups to GitHub, uncomment the `git add/commit` lines in the script
  (configure git credentials; be aware dumps may contain PII).

### Maintenance
- The 3-month reminder is driven by `backups/last-maintenance.txt`.
- Update that file when maintenance is completed.

---

## 15. Guardrails — do not do these

- ❌ Do not switch the runtime DB back to SQLite.
- ❌ Do not import the legacy SQLite DB without explicit confirmation.
- ❌ Do not run `db:reset` against production.
- ❌ Do not add `migrate()` calls in both `server.ts` and `seed()`.
- ❌ Do not move `express-async-errors` below other imports.
- ❌ Do not use `error.errors` with Zod 4; use `error.issues`.
- ❌ Do not commit `.env`, secrets, uploads, or database dumps with PII.
- ❌ Do not bypass permission middleware on admin routes.
- ❌ Do not write comments in source unless asked.
- ❌ Do not reformat unrelated files or rename things opportunistically.
- ❌ Do not delete the `backups/` or `server/storage/` folders.

---

## 16. Common pitfalls

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED` on `/api/auth/login` | Vite started before API. Use `npm run dev` (health-gated) or `Server_Start.bat`; proxy target must be `127.0.0.1:5000`. |
| `ECONNRESET` during migrate | Remote DB dropped connection; `migrate()` retries. Don't call `migrate()` twice. |
| Server exits immediately on start | `.env.local` points to a stopped local MySQL. Remove it or start Docker MySQL. |
| Slow pages | Remote DB latency. Use local MySQL; keep page queries small/paginated. |
| `EADDRINUSE :5000` | Another node process is running. Use `Server_Stop.bat` or kill node. |
| Batch window closes instantly | CRLF line endings + `pause` required; do not detach without keeping the console alive. |
| Seeding runs every boot | `system.schema_version` missing/mismatched. Bump `SCHEMA_VERSION` only with real changes. |
| Permission denied on admin page | Check role + permission catalogue/matrix; re-seed after changes. |
| `key` SQL syntax error | `key` is reserved; use backticks or let `normalizeSql` handle it. |
| Laravel password login fails | Hashes starting `$2y$` must be re-encoded to `$2b$` (import script does this). |
| Dashboard volume shows but ledger empty | Volume comes from `business_transactions`; ledger rows are created by payouts/reconciliation. They are separate concepts. |

---

## 17. Verification checklist (definition of done)

For any backend change:
1. `npx tsc --noEmit -p server/tsconfig.json`
2. `npm run build --workspace @nexora/server`
3. Restart the API and hit `/health`.
4. Exercise the affected endpoint(s) with a valid token.
5. For DB work, confirm table counts / expected rows.
6. For permissions, verify with a member and an admin account.
7. For frontend changes, `npm run build --workspace @nexora/client` and check the
   page loads without console errors.

For seed/migration changes:
- Bump `SCHEMA_VERSION` in `seed.ts`.
- Test on an empty local DB and on an existing DB.
- Confirm startup is still fast on subsequent boots.

For destructive scripts:
- Confirm with the user first.
- Use `FORCE_RESET=1` only for `db:reset`.
- Never run against production without a backup.

---

## 18. Recommended agent workflow

1. **Read first:** `AGENTS.md`, `README.md`, `server/src/config/index.ts`,
   `server/src/db/index.ts`, the relevant route/controller/service.
2. **Locate the layer:** UI page → route → controller → service → DB.
3. **Make the smallest correct change.** Reuse existing helpers
   (`transaction`, `recordAudit`, permission middleware, `HttpError`).
4. **Keep consistency:** naming, response shapes, Zod schemas, pagination.
5. **Typecheck and build.**
6. **Run the affected flow** (login, list, create, approve, etc.).
7. **Report** what changed, how it was verified, and any follow-ups.

When unsure:
- Ask before destructive DB operations.
- Prefer reading the existing implementation over inventing a new pattern.
- If a request conflicts with a guardrail, stop and explain.

---

## 19. Copy-paste system prompt (short version)

```
You are working on NEXORA, a TypeScript monorepo (React 18 + Vite client,
Express + MySQL server) for a multi-level marketing platform.

Non-negotiables:
- Runtime DB is MySQL via mysql2; never reintroduce SQLite at runtime.
- Use db.prepare(...).get/all/run and transaction() for multi-step writes.
- All DB calls are async; always await. ESM imports use .js extensions.
- express-async-errors must be the first import in server/src/app.ts.
- Zod 4: use error.issues, not error.errors.
- Admin routes require authenticate + role/permission middleware.
- Never commit .env/secrets/uploads/PII.
- Bump SCHEMA_VERSION in server/src/db/seed.ts when adding migrations/seed data.
- Verify with: npx tsc --noEmit -p server/tsconfig.json && npm run build.

Domain: users/referrals/closure trees, KYC, business transactions,
generation commissions, ranks, salary, rewards, wallet ledger, deposits,
withdrawals, reconciliation, audit logs, developer panel.

Read AGENTS.md for the full project map, conventions and pitfalls.
Make the smallest correct change, verify it, and report what you did.
```

---

## 20. Current known gaps / notes

- The developer panel currently exposes **Overview, Users & Activity, Audit stream,
  Demo data**. A database export/import tab was discussed but is **not implemented**
  in the current source (no `/developer/database/*` routes).
- `server/database/` may contain legacy SQLite files; they are not used at runtime.
- The legacy Laravel importer is destructive and requires explicit confirmation.
- `npm audit` may fail with a registry `ECONNRESET`; that is a network error, not a
  detected vulnerability. `npm install` currently reports 0 vulnerabilities
  (Zod is pinned to `^4.6.7`).
- Backups are written to `backups/`; the folder is not ignored by git, by design
  for the requested GitHub backup workflow. Review PII exposure before pushing.
