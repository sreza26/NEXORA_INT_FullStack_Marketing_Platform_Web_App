import { AsyncLocalStorage } from 'node:async_hooks'
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from 'mysql2/promise'
import { config } from '../config/index.js'

const transactionStorage = new AsyncLocalStorage<PoolConnection>()

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: config.db.poolLimit,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
      decimalNumbers: true,
      timezone: 'Z',
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
    })
  }
  return pool
}

function executor(): Pool | PoolConnection {
  return transactionStorage.getStore() ?? getPool()
}

export async function closeDb(): Promise<void> {
  if (!pool) return
  const closing = pool
  pool = null
  await closing.end()
}

const SQLITE_TO_MYSQL: Array<[RegExp, string]> = [
  [/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT IGNORE INTO'],
  [/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, 'REPLACE INTO'],
  [/\bdatetime\s*\(\s*'now'\s*\)/gi, 'NOW()'],
  [/\bdatetime\s*\(\s*"now"\s*\)/gi, 'NOW()'],
]

export function normalizeSql(sql: string): string {
  let out = sql.replace(
    /\bdatetime\s*\(\s*['"]now['"]\s*,\s*['"]\s*([+-]?\d+)\s+(day|hour|minute|second|month|year)s?\s*['"]\s*\)/gi,
    (_match, amount: string, unit: string) => `DATE_ADD(NOW(), INTERVAL ${Number(amount)} ${unit.toUpperCase()})`,
  )
  out = out.replace(/(?<![\w`])key(?![\w`])/gi, (match, offset: number, source: string) => {
    const before = source.slice(Math.max(0, offset - 20), offset).toUpperCase()
    if (/ON\s+DUPLICATE\s*$/.test(before) || /(FOREIGN|PRIMARY|UNIQUE)\s*$/.test(before)) return match
    return '`key`'
  })
  for (const [pattern, replacement] of SQLITE_TO_MYSQL) out = out.replace(pattern, replacement)

  if (/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+NOTHING/i.test(out)) {
    out = out.replace(/INSERT\s+INTO\b/gi, 'INSERT IGNORE INTO')
    out = out.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+NOTHING/gi, '')
  }

  out = out.replace(
    /ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET/gi,
    'ON DUPLICATE KEY UPDATE',
  )
  out = out.replace(/\bexcluded\.([a-zA-Z0-9_]+)\b/g, 'VALUES($1)')

  return out
}

export interface RunResult {
  changes: number
  lastInsertRowid: number
}

class Statement {
  constructor(private readonly sql: string) {}

  async get<T = unknown>(...params: unknown[]): Promise<T | undefined> {
    const [rows] = await executor().query(normalizeSql(this.sql), params)
    if (!Array.isArray(rows)) return undefined
    return rows[0] as T | undefined
  }

  async all<T = unknown>(...params: unknown[]): Promise<T[]> {
    const [rows] = await executor().query(normalizeSql(this.sql), params)
    return (Array.isArray(rows) ? rows : []) as T[]
  }

  async run(...params: unknown[]): Promise<RunResult> {
    const [result] = await executor().query(normalizeSql(this.sql), params)
    const header = result as ResultSetHeader
    return {
      changes: Number(header?.affectedRows ?? 0),
      lastInsertRowid: Number(header?.insertId ?? 0),
    }
  }
}

export const db = {
  prepare(sql: string): Statement {
    return new Statement(sql)
  },
  async exec(sql: string): Promise<void> {
    await executor().query(normalizeSql(sql))
  },
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await executor().query(normalizeSql(sql), params)
    return (Array.isArray(rows) ? rows : []) as T[]
  },
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (transactionStorage.getStore()) return fn()

  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const result = await transactionStorage.run(connection, fn)
    await connection.commit()
    return result
  } catch (error) {
    try {
      await connection.rollback()
    } catch {
      // The original error is more useful than a rollback failure.
    }
    throw error
  } finally {
    connection.release()
  }
}

const TIMESTAMP_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'email_verified_at',
  'registered_at',
  'suspended_at',
  'requested_at',
  'processed_at',
  'reviewed_at',
  'paid_at',
  'achieved_at',
  'claimed_at',
  'approved_at',
  'activated_at',
  'started_at',
  'finished_at',
  'published_at',
  'expires_at',
  'verified_at',
  'read_at',
  'submitted_at',
  'hold_until',
  'last_reconciled_at',
  'commissioned_at',
  'effective_from',
  'effective_to',
  'eligibility_from',
  'eligibility_to',
  'run_at',
  'created',
  'updated',
])

function convertSchema(sql: string): string {
  let out = sql
  out = out.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY')
  out = out.replace(/email\s+TEXT\s+PRIMARY\s+KEY/gi, 'email VARCHAR(255) PRIMARY KEY')
  out = out.replace(/\bname\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi, 'name VARCHAR(255) NOT NULL UNIQUE')
  out = out.replace(/\bemail\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi, 'email VARCHAR(255) NOT NULL UNIQUE')
  out = out.replace(
    /\bmember_code\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi,
    'member_code VARCHAR(64) NOT NULL UNIQUE',
  )
  out = out.replace(/\bcode\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi, 'code VARCHAR(64) NOT NULL UNIQUE')
  out = out.replace(/\breference\s+TEXT\s+UNIQUE/gi, 'reference VARCHAR(191) UNIQUE')
  out = out.replace(/\bperiod\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi, 'period VARCHAR(32) NOT NULL UNIQUE')
  out = out.replace(/\bperiod\s+TEXT\s+NOT\s+NULL/gi, 'period VARCHAR(32) NOT NULL')
  out = out.replace(/\bkey\s+TEXT\s+NOT\s+NULL\s+UNIQUE/gi, '`key` VARCHAR(191) NOT NULL UNIQUE')
  out = out.replace(/\bkey\s+TEXT\b/gi, '`key` VARCHAR(255)')

  for (const column of TIMESTAMP_COLUMNS) {
    out = out.replace(new RegExp(`\\b${column}\\s+TEXT\\b`, 'gi'), `${column} DATETIME`)
  }

  out = out.replace(
    /DEFAULT\s*\(\s*(?:datetime\s*\(\s*'now'\s*\)|NOW\(\))\s*\)/gi,
    'DEFAULT CURRENT_TIMESTAMP',
  )
  out = out.replace(/DEFAULT\s+NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
  out = out.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/gi, 'CREATE $1INDEX')

  return out
}

const SCHEMA = `
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
  name TEXT NOT NULL UNIQUE,
  label TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT,
  group_name TEXT
);

CREATE TABLE IF NOT EXISTS permission_role (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE (permission_id, role_id)
);

CREATE TABLE IF NOT EXISTS permission_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (permission_id, user_id)
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
  reference TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL,
  account_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  review_note TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  processed_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  paid_by INTEGER REFERENCES users(id),
  paid_at TEXT,
  ledger_entry_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS referral_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salary_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rank_id INTEGER NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active INTEGER NOT NULL DEFAULT 1,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  email TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

const COLUMN_MIGRATIONS: Array<[string, string, string, string?]> = [
  ['roles', 'label', 'TEXT'],
  ['roles', 'description', 'TEXT'],
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
  ['compensation_plans', 'name', 'TEXT', "'Compensation Plan'"],
  ['compensation_plans', 'commission_base', 'TEXT', "'eligible_verified_amount'"],
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
  ['withdrawal_requests', 'reference', 'TEXT'],
  ['withdrawal_requests', 'currency', 'TEXT', "'USD'"],
  ['withdrawal_requests', 'review_note', 'TEXT'],
  ['withdrawal_requests', 'reviewed_by', 'INTEGER'],
  ['withdrawal_requests', 'reviewed_at', 'TEXT'],
  ['withdrawal_requests', 'paid_by', 'INTEGER'],
  ['withdrawal_requests', 'paid_at', 'TEXT'],
  ['withdrawal_requests', 'ledger_entry_id', 'INTEGER'],
  ['withdrawal_requests', 'created_at', 'TEXT'],
  ['withdrawal_requests', 'updated_at', 'TEXT'],
  ['reward_claims', 'note', 'TEXT'],
  ['reward_claims', 'reviewed_by', 'INTEGER'],
  ['reward_claims', 'reviewed_at', 'TEXT'],
  ['deposits', 'notes', 'TEXT'],
  ['deposits', 'verified_by', 'INTEGER'],
  ['deposits', 'verified_at', 'TEXT'],
  ['audit_logs', 'old_values', 'TEXT'],
  ['audit_logs', 'new_values', 'TEXT'],
  ['audit_logs', 'ip_address', 'TEXT'],
  ['audit_logs', 'user_agent', 'TEXT'],
  ['audit_logs', 'auditable_type', 'TEXT'],
  ['audit_logs', 'auditable_id', 'INTEGER'],
  ['audit_logs', 'updated_at', 'TEXT'],
  ['rewards', 'code', 'TEXT'],
  ['rewards', 'claimed_count', 'INTEGER', '0'],
  ['rewards', 'eligibility_from', 'TEXT'],
  ['rewards', 'eligibility_to', 'TEXT'],
  ['rewards', 'config', 'TEXT'],
  ['rewards', 'updated_at', 'TEXT'],
  ['business_transactions', 'currency', 'TEXT', "'USD'"],
  ['business_transactions', 'verified_by', 'INTEGER'],
  ['business_transactions', 'commissioned_by_job_run_id', 'INTEGER'],
  ['business_transactions', 'commissioned_at', 'TEXT'],
  ['business_transactions', 'reversal_of_id', 'INTEGER'],
  ['business_transactions', 'notes', 'TEXT'],
  ['business_transactions', 'updated_at', 'TEXT'],
  ['wallet_accounts', 'status', 'TEXT', "'active'"],
  ['wallet_accounts', 'last_reconciled_at', 'TEXT'],
  ['rank_requirements', 'target_rank_id', 'INTEGER'],
  ['rank_requirements', 'period', 'TEXT', "'monthly'"],
  ['rank_requirements', 'require_separate_branches', 'INTEGER', '0'],
  ['rank_requirements', 'created_at', 'TEXT'],
  ['rank_requirements', 'updated_at', 'TEXT'],
  ['member_profiles', 'date_of_birth', 'TEXT'],
  ['member_profiles', 'referral_source', 'TEXT'],
  ['member_profiles', 'meta', 'TEXT'],
  ['application_settings', 'is_secret', 'INTEGER', '0'],
  ['compensation_plans', 'eligibility_requirements', 'TEXT'],
  ['compensation_plans', 'updated_at', 'TEXT'],
  ['ranks', 'description', 'TEXT'],
  ['ranks', 'sort_order', 'INTEGER', '0'],
  ['users', 'remember_token', 'TEXT'],
  ['referral_closures', 'created_at', 'TEXT'],
]

function isIgnorableSchemaError(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  return code === 'ER_TABLE_EXISTS_ERROR' || code === 'ER_DUP_KEYNAME' || code === 'ER_FK_DUP_NAME'
}

export async function ensureColumn(
  table: string,
  column: string,
  type: string,
  defaultValue?: string,
): Promise<boolean> {
  const [rows] = await getPool().query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  if (Array.isArray(rows) && rows.length > 0) return false

  let baseType = type
  let fallback = defaultValue
  const inlineDefault = /^(.+?)\s+DEFAULT\s+(.+)$/i.exec(type)
  if (inlineDefault) {
    baseType = inlineDefault[1]
    if (fallback === undefined) fallback = inlineDefault[2]
  }

  const needsKeyLength = /TEXT/i.test(baseType) && fallback !== undefined
  if (needsKeyLength) baseType = 'VARCHAR(255)'
  if (TIMESTAMP_COLUMNS.has(column) && /TEXT/i.test(baseType)) baseType = 'DATETIME'

  const def = fallback !== undefined ? ` DEFAULT ${fallback}` : ''
  await getPool().query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${baseType}${def}`)
  return true
}

async function applyColumnMigrations(): Promise<void> {
  for (const [table, column, type, defaultValue] of COLUMN_MIGRATIONS) {
    await ensureColumn(table, column, type, defaultValue)
  }

  await db.exec(
    `UPDATE business_transactions
     SET gross_amount = amount
     WHERE (gross_amount IS NULL OR gross_amount = 0) AND amount IS NOT NULL AND amount <> 0`,
  )
  await db.exec(
    `UPDATE business_transactions
     SET eligible_amount = gross_amount
     WHERE (eligible_amount IS NULL OR eligible_amount = 0) AND gross_amount <> 0`,
  )
  await db.exec(
    `UPDATE business_transactions SET amount = gross_amount WHERE (amount IS NULL OR amount = 0) AND gross_amount <> 0`,
  )
  await db.exec(`UPDATE ranks SET is_active = 1 WHERE is_active IS NULL`)
  await db.exec(`UPDATE wallet_accounts SET pending_balance = 0 WHERE pending_balance IS NULL`)
  await db.exec(`UPDATE wallet_accounts SET lifetime_credited = 0 WHERE lifetime_credited IS NULL`)
  await db.exec(`UPDATE wallet_accounts SET lifetime_debited = 0 WHERE lifetime_debited IS NULL`)
  await db.exec(
    `UPDATE withdrawal_requests SET created_at = COALESCE(created_at, requested_at, NOW())
     WHERE created_at IS NULL`,
  )
  await db.exec(
    `UPDATE withdrawal_requests SET updated_at = COALESCE(updated_at, processed_at, created_at, NOW())
     WHERE updated_at IS NULL`,
  )
}

export async function migrate(): Promise<void> {
  const connection = await getPool().getConnection()
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const statement of convertSchema(SCHEMA).split(';')) {
      const sql = statement.trim()
      if (!sql) continue
      try {
        await connection.query(sql)
      } catch (error) {
        if (isIgnorableSchemaError(error)) continue
        throw error
      }
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  } finally {
    connection.release()
  }

  await applyColumnMigrations()
}

export async function tableExists(table: string): Promise<boolean> {
  const [rows] = await getPool().query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  )
  return Array.isArray(rows) && rows.length > 0
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function serverPaths() {
  return {
    serverRoot: config.serverRoot,
    database: `${config.db.host}:${config.db.port}/${config.db.name}`,
    uploadsDir: config.uploadsDir,
  }
}
