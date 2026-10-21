# NEXORA — Full Stack (TypeScript)

A rebuild of the NEXORA marketing & network management platform as a modern
full-stack application:

- **Client** — React 18 + TypeScript + Vite + plain CSS
- **Server** — Node.js + Express + TypeScript
- **Database** — SQLite via the built-in `node:sqlite` driver (no native build step)
- **Scripts** — Windows batch files for install / seed / dev / build / start / test

## Quick start

```bat
install.bat    :: install dependencies
seed.bat       :: create and seed the database
dev.bat        :: run API (5000) + client (5173)
```

Open <http://localhost:5173>.

Production-style run:

```bat
build.bat      :: compile client + server
start.bat      :: serve the built app on http://localhost:5000
```

Verify the API end to end:

```bat
test.bat
```

## Demo accounts

| Role   | Email                | Password        |
| ------ | -------------------- | --------------- |
| Admin  | admin@nexora.test    | `Password123!`  |
| Member | leader@nexora.test   | `Password123!`  |

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
- **RBAC** — `member`, `support_agent`, `compliance_officer`,
  `finance_admin`, `super_admin`. Every admin route requires a non-member role.

## Configuration

`server/.env` (copy from `server/.env.example`):

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `JWT_SECRET` | token signing secret | dev placeholder |
| `DATABASE_FILE` | SQLite file, relative to `server/` | `database/nexora.sqlite` |
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
GET  /api/public/config         GET /api/public/referral/:code   POST /api/public/contact
```

## Deployment

`build.bat` produces `client/dist` (static assets) and `server/dist`
(compiled API). The Express server serves the compiled client, so a single
Node process on any Node 22+ host runs the whole platform. Use
`start.bat` or `npm run start` with `NODE_ENV=production` and a real
`JWT_SECRET`.
