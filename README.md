# NEXORA_INT_FullStack_Marketing_Platform_Web_App — Full Stack (TypeScript)

A rebuild of the NEXORA marketing & network management platform as a modern
full-stack application:

- **Client** — React 18 + TypeScript + Vite + plain CSS
- **Server** — Node.js + Express + TypeScript
- **Database** — MySQL / MariaDB via `mysql2`
- **Scripts** — Windows batch files for install / seed / dev / build / start / test

## Quick start

```bat
dev.bat        :: install dependencies if needed, then run API (5000) + client (5173)
```

Open <http://localhost:5173>. The client only starts after the API health check
passes, so login requests cannot hit a closed port while the server is still
migrating.

The database tables, ranks, compensation plan, roles/permissions and demo
accounts are created automatically on first boot. You can also run them
explicitly (from `server/`):

```bash
npm run db:seed          # migrate + seed (idempotent)
npm run db:reset         # drop every table (set FORCE_RESET=1 outside test)
npm run db:import-laravel  # import data from the legacy Laravel SQLite file
npm test                 # end-to-end smoke test against the configured MySQL DB
```

Production-style run:

```bat
build.bat      :: compile client + server
start.bat      :: serve the built app on http://localhost:5000
```

Verify the API end to end:

```bash
npm test --workspace=server
```

## Demo accounts

| Role      | Email                | Password        |
| --------- | -------------------- | --------------- |
| Developer | sreza26@gmail.com    | `NexoraDev@2026!` |
| Admin     | admin@nexora.test    | `Password123!`  |
| Member    | leader@nexora.test   | `Password123!`  |

> The **developer** account is created on first boot and is hidden from the
> member directory, member counts and every non-developer administrator. Set
> `DEVELOPER_PASSWORD` in `server/.env` before the first boot to choose its
> password. Once the account has the `developer` role the password is not reset
> on restart. The value in this table is only the fallback when the variable is
> unset.

## Project layout

```
client/                 React + Vite frontend
  src/pages/            landing, public pages, member portal, admin portal
  src/components/       shared shell, tables, stat cards
  src/lib/api.ts        axios client with bearer token handling
server/                 Express API
  src/config/           environment configuration
  src/db/               schema, migrations, seed data
  src/models/           data access (users, ledger)
  src/services/         tree, commissions, withdrawals, rewards, ranks
  src/controllers/      auth, member, admin
  src/routes/           route definitions
  src/middlewares/      JWT auth, role guard, error handling
  scripts/              seed, reset, smoke test
shared/types/           types shared between client and server
scripts/                helper scripts
```

## Business rules

- **Referrals** — a sponsor code (`/r/:code`) is captured on the client and
  attached to the registration. Invalid codes are rejected.
- **Commissions** — a recorded purchase credits the sponsor chain up to
  `COMMISSION_GENERATION` levels using `COMMISSION_RATES`. A unique index on
  `(recipient_id, source_transaction_id, generation)` makes generation
  idempotent.
- **Ledger** — every balance change is written as an append-only ledger entry
  carrying the resulting balance. Rejections write a compensating reversal
  entry instead of deleting rows.
- **Withdrawals** — requesting a withdrawal debits the wallet immediately
  (funds are held) and creates a pending ledger entry. Approval marks the
  entry approved; rejection posts a reversal that refunds the member.
- **Ranks** — recalculated from direct referrals and downline volume; each rank
  carries a monthly salary paid into the wallet.
- **Rewards** — claimed with wallet balance, refunded automatically when a
  claim is rejected.
- **RBAC** — `member`, `developer`, `support_agent`, `compliance_officer`,
  `finance_admin`, `super_admin`. Every admin route requires a non-member role.
  `super_admin` and `developer` pass every permission check; only the
  `developer` role can open the system debug panel or act on the developer
  account.

## Developer panel

Sign in as the developer and open **Developer → System Debug Panel**
(`/developer`) to inspect data normally hidden from the admin UI:

- **Overview** — runtime environment, MySQL/MariaDB version, database size,
  memory and uptime, pending work counters, per-table row counts and recent
  scheduled job runs.
- **Users & activity** — every account (including the developer) with roles,
  status, verification state and activity counters; click a row for wallet,
  transactions, commissions, ledger, notifications, audit events and rank
  snapshots.
- **Audit stream** — searchable/filterable audit log with actor, subject, IP,
  plus recent business transactions and job runs.
- **Demo data** — counts everything seeded by `DemoSeeder` (`@demo.test`
  members and `DEMO-*` transactions) and lets the developer purge it by typing
  `DELETE`. Real members are never touched. The same operation is available to
  other administrators as the **Delete demo data** action in admin Settings.

## Configuration

`server/.env` (copy from `server/.env.example`):

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `JWT_SECRET` | token signing secret | dev placeholder |
| `DB_HOST` / `DB_PORT` | MySQL host and port | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL database and credentials | `nexora` / `nexora` / empty |
| `DB_SSL` | enable TLS to MySQL | `false` |
| `DB_POOL_LIMIT` | connection pool size | `10` |
| `COMMISSION_GENERATION` | payout levels | `3` |
| `COMMISSION_RATES` | rate per generation | `0.10,0.05,0.03` |
| `WITHDRAWAL_MIN` / `WITHDRAWAL_MAX` | payout limits | `50` / `10000` |
| `SPONSOR_REQUIRED` | force a sponsor code at registration | `false` |
| `CLIENT_ORIGIN` | allowed CORS origins | `http://localhost:5173` |

## API overview

```
POST /api/auth/register         POST /api/auth/login        GET /api/auth/me
GET  /api/member/summary        GET /api/member/referrals   GET /api/member/network
GET  /api/member/commissions    GET /api/member/ledger      GET /api/member/rank
GET  /api/member/withdrawals    POST /api/member/withdrawals
GET  /api/member/rewards        POST /api/member/rewards/claim
GET  /api/admin/summary         GET  /api/admin/members     PATCH /api/admin/members/:id
GET  /api/admin/withdrawals     POST /api/admin/withdrawals/:id
GET  /api/admin/rewards         POST /api/admin/rewards     POST /api/admin/reward-claims/:id
GET  /api/admin/ranks           POST /api/admin/purchases   POST /api/admin/salary/run
GET  /api/admin/report?format=csv|xlsx
GET  /api/developer/overview    GET /api/developer/users   GET /api/developer/users/:id
GET  /api/developer/activity    GET /api/developer/demo-data
DELETE /api/developer/demo-data (body: { "confirm": "DELETE" })
GET  /api/public/config         GET /api/public/referral/:code   POST /api/public/contact
```

## Deployment (Hostinger Node.js)

`npm run build` produces `client/dist` (static assets) and `server/dist`
(compiled API). The Express server serves the compiled client, so a single
Node process runs the whole platform.

1. Create the MySQL database and user in hPanel, then copy the credentials into
   `server/.env` (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
2. Set `NODE_ENV=production`, `APP_URL=https://nexoraint.net`,
   `CLIENT_ORIGIN=https://nexoraint.net,https://www.nexoraint.net`, a strong
   `JWT_SECRET`, and a fresh `ENCRYPTION_KEY`/`APP_KEY`.
3. Build: `npm install` then `npm run build` (uses `npx --yes tsc` in workspaces for Hostinger compatibility).
4. In hPanel → **Node.js**, set the application root to the project root and the
   startup file to `app.js`, then run `npm install` (or upload `node_modules`).
5. The startup file imports `server/dist/server.js`, which runs migrations,
   seeds required roles/settings, and serves both the API and the built client.

`app.js` is the Hostinger/Passenger entry point. Locally, `npm start` uses the
same entry point; `npm run start:server` starts the compiled server directly.
