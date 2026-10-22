import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { config, serverRoot } from '../config/index.js'

const originalEmit = process.emitWarning.bind(process)
process.emitWarning = ((warning: string | Error, ...args: any[]) => {
  if (typeof warning === 'string' && warning.includes('SQLite is an experimental feature')) return
  if (warning instanceof Error && warning.message.includes('SQLite is an experimental feature')) return
  return originalEmit(warning as any, ...args)
}) as typeof process.emitWarning

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true })
fs.mkdirSync(config.uploadsDir, { recursive: true })

export const db = new DatabaseSync(config.databaseFile)

db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  member_code TEXT NOT NULL UNIQUE,
  sponsor_id INTEGER REFERENCES users(id),
  current_rank_id INTEGER REFERENCES ranks(id),
  status TEXT NOT NULL DEFAULT 'active',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  email_verified_at TEXT,
  registered_at TEXT,
  suspended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_sponsor ON users(sponsor_id);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS ranks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  salary REAL NOT NULL DEFAULT 0,
  min_direct_links INTEGER DEFAULT 0,
  downline_volume REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rank_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rank_id INTEGER NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value REAL,
  label TEXT,
  target_rank_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS compensation_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT
);

CREATE TABLE IF NOT EXISTS compensation_plan_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES compensation_plans(id) ON DELETE CASCADE,
  generation_from INTEGER NOT NULL,
  generation_to INTEGER NOT NULL,
  rate REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance REAL NOT NULL DEFAULT 0,
  pending_balance REAL NOT NULL DEFAULT 0,
  lifetime_credited REAL NOT NULL DEFAULT 0,
  lifetime_debited REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_member ON ledger_entries(member_id);

CREATE TABLE IF NOT EXISTS business_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference TEXT UNIQUE,
  gross_amount REAL NOT NULL DEFAULT 0,
  eligible_amount REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'purchase',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_business_transactions_member ON business_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_business_transactions_status ON business_transactions(status);

CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_transaction_id INTEGER REFERENCES business_transactions(id),
  generation INTEGER NOT NULL,
  amount REAL NOT NULL,
  rate REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commissions_recipient ON commissions(recipient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_unique ON commissions(recipient_id, source_transaction_id, generation);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  account_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  processed_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_member ON withdrawal_requests(member_id);

CREATE TABLE IF NOT EXISTS rank_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank_id INTEGER NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
  achieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  cost REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  subject_type TEXT,
  subject_id INTEGER,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  hold_until TEXT,
  policy_state TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  data TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_closures (
  ancestor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  descendant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ancestor_id, descendant_id)
);
CREATE INDEX IF NOT EXISTS idx_referral_closures_descendant ON referral_closures(descendant_id);

CREATE TABLE IF NOT EXISTS salary_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salary_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank_id INTEGER REFERENCES ranks(id) ON DELETE SET NULL,
  salary_period_id INTEGER REFERENCES salary_periods(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  processed_by INTEGER REFERENCES users(id),
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_salary_payouts_member ON salary_payouts(member_id);

CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  processed_count INTEGER,
  started_at TEXT,
  finished_at TEXT,
  host TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reconciliation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expected_balance REAL NOT NULL DEFAULT 0,
  ledger_sum REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'match',
  notes TEXT,
  run_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_rank_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank_id INTEGER REFERENCES ranks(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  paid_rank_id INTEGER,
  personal_volume REAL NOT NULL DEFAULT 0,
  group_volume REAL NOT NULL DEFAULT 0,
  direct_referrals INTEGER NOT NULL DEFAULT 0,
  salary_eligible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_rank_snapshots_unique ON member_rank_snapshots(member_id, period);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  severity TEXT NOT NULL DEFAULT 'info',
  expires_at TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS application_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  group_name TEXT NOT NULL DEFAULT 'general',
  type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  UNIQUE (role_id, permission)
);
`

export function migrate(): void {
  db.exec(SCHEMA)
  applyColumnMigrations()
}

/**
 * Add a column to an existing table when it is missing. Returns true when the
 * column was created, false when it already existed.
 */
export function ensureColumn(table: string, column: string, type: string, defaultValue?: string): boolean {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (info.some((c) => c.name === column)) return false
  const def = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : ''
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`)
  return true
}

const COLUMN_MIGRATIONS: Array<[string, string, string, string?]> = [
  ['users', 'suspension_reason', 'TEXT'],
  ['users', 'email_verified_at', 'TEXT'],
  ['member_profiles', 'full_name', 'TEXT'],
  ['member_profiles', 'nid_number', 'TEXT'],
  ['member_profiles', 'nid_document_path', 'TEXT'],
  ['member_profiles', 'selfie_document_path', 'TEXT'],
  ['member_profiles', 'address_line', 'TEXT'],
  ['member_profiles', 'emergency_contact', 'TEXT'],
  ['wallet_accounts', 'pending_balance', 'REAL', '0'],
  ['wallet_accounts', 'lifetime_credited', 'REAL', '0'],
  ['wallet_accounts', 'lifetime_debited', 'REAL', '0'],
  ['business_transactions', 'gross_amount', 'REAL', '0'],
  ['business_transactions', 'eligible_amount', 'REAL', '0'],
  ['business_transactions', 'description', 'TEXT'],
  ['business_transactions', 'verified_at', 'TEXT'],
  ['commissions', 'plan_id', 'INTEGER'],
  ['commissions', 'idempotency_key', 'TEXT'],
  ['commissions', 'base_amount', 'REAL', '0'],
  ['commissions', 'approved_by', 'INTEGER'],
  ['commissions', 'approved_at', 'TEXT'],
  ['commissions', 'paid_at', 'TEXT'],
  ['commissions', 'rejection_reason', 'TEXT'],
  ['compensation_plans', 'name', "TEXT DEFAULT 'Compensation Plan'"],
  ['compensation_plans', 'commission_base', "TEXT DEFAULT 'eligible_verified_amount'"],
  ['compensation_plans', 'eligible_transaction_types', 'TEXT'],
  ['compensation_plans', 'effective_from', 'TEXT'],
  ['compensation_plans', 'effective_to', 'TEXT'],
  ['compensation_plans', 'notes', 'TEXT'],
  ['compensation_plans', 'created_by', 'INTEGER'],
  ['compensation_plans', 'approved_by', 'INTEGER'],
  ['compensation_plans', 'approved_at', 'TEXT'],
  ['ranks', 'is_active', 'INTEGER', '1'],
  ['rewards', 'threshold_amount', 'REAL', '0'],
  ['rewards', 'budget', 'REAL'],
  ['rewards', 'max_claims', 'INTEGER'],
  ['rewards', 'required_rank_id', 'INTEGER'],
  ['reward_claims', 'note', 'TEXT'],
  ['reward_claims', 'reviewed_by', 'INTEGER'],
  ['reward_claims', 'reviewed_at', 'TEXT'],
  ['withdrawal_requests', 'reference', 'TEXT'],
  ['withdrawal_requests', 'review_note', 'TEXT'],
  ['withdrawal_requests', 'paid_at', 'TEXT'],
  ['deposits', 'notes', 'TEXT'],
  ['deposits', 'verified_by', 'INTEGER'],
  ['deposits', 'verified_at', 'TEXT'],
  ['audit_logs', 'old_values', 'TEXT'],
  ['audit_logs', 'new_values', 'TEXT'],
  ['audit_logs', 'ip_address', 'TEXT'],
  ['audit_logs', 'user_agent', 'TEXT'],
  ['audit_logs', 'auditable_type', 'TEXT'],
  ['audit_logs', 'auditable_id', 'INTEGER'],
]

function applyColumnMigrations(): void {
  for (const [table, column, type, defaultValue] of COLUMN_MIGRATIONS) {
    ensureColumn(table, column, type, defaultValue)
  }

  db.exec(
    `UPDATE business_transactions
     SET gross_amount = amount
     WHERE (gross_amount IS NULL OR gross_amount = 0) AND amount IS NOT NULL AND amount <> 0`,
  )
  db.exec(
    `UPDATE business_transactions
     SET eligible_amount = gross_amount
     WHERE (eligible_amount IS NULL OR eligible_amount = 0) AND gross_amount <> 0`,
  )
  db.exec(`UPDATE business_transactions SET amount = gross_amount WHERE (amount IS NULL OR amount = 0) AND gross_amount <> 0`)
  db.exec(`UPDATE ranks SET is_active = 1 WHERE is_active IS NULL`)
  db.exec(`UPDATE wallet_accounts SET pending_balance = 0 WHERE pending_balance IS NULL`)
  db.exec(`UPDATE wallet_accounts SET lifetime_credited = 0 WHERE lifetime_credited IS NULL`)
  db.exec(`UPDATE wallet_accounts SET lifetime_debited = 0 WHERE lifetime_debited IS NULL`)
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function serverPaths() {
  return { serverRoot, databaseFile: config.databaseFile, uploadsDir: config.uploadsDir }
}
