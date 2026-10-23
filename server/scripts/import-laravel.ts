import fs from 'fs'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { db, migrate } from '../src/db/index.js'

const SOURCE =
  process.env.LARAVEL_DB ??
  'D:/AI_CODING/NEXORA_Marketing_Platform_Web_App/database/database.sqlite'

if (!fs.existsSync(SOURCE)) {
  console.error(`[import-laravel] source database not found: ${SOURCE}`)
  process.exit(1)
}

const src = new DatabaseSync(SOURCE, { readOnly: true })
const all = <T = Record<string, unknown>>(sql: string): T[] => src.prepare(sql).all() as T[]

const TABLES = [
  'permission_user',
  'permission_role',
  'user_roles',
  'referral_closures',
  'referral_edges',
  'ledger_entries',
  'commissions',
  'business_transactions',
  'wallet_accounts',
  'member_profiles',
  'reward_claims',
  'rewards',
  'rank_requirements',
  'rank_achievements',
  'member_rank_snapshots',
  'salary_payouts',
  'salary_periods',
  'salary_rules',
  'withdrawal_requests',
  'deposits',
  'notifications',
  'announcements',
  'audit_logs',
  'reconciliation_records',
  'scheduled_job_runs',
  'compensation_plan_rates',
  'compensation_plans',
  'users',
  'ranks',
  'roles',
  'permissions',
  'application_settings',
  'password_reset_tokens',
  'email_verification_tokens',
]

migrate()

let rehashed = 0

db.exec('PRAGMA foreign_keys = OFF;')
try {
  db.exec('BEGIN')
  for (const table of TABLES) db.exec(`DELETE FROM ${table}`)

  for (const row of all('SELECT id, name, label, description FROM roles ORDER BY id')) {
    db.prepare('INSERT INTO roles (id, name, label, description) VALUES (?, ?, ?, ?)').run(
      row.id,
      row.name,
      row.label,
      row.description,
    )
  }

  for (const row of all('SELECT id, name, label, "group" AS group_name FROM permissions ORDER BY id')) {
    db.prepare('INSERT INTO permissions (id, name, label, group_name) VALUES (?, ?, ?, ?)').run(
      row.id,
      row.name,
      row.label,
      row.group_name,
    )
  }

  for (const row of all('SELECT id, permission_id, role_id FROM permission_role ORDER BY id')) {
    db.prepare('INSERT INTO permission_role (id, permission_id, role_id) VALUES (?, ?, ?)').run(
      row.id,
      row.permission_id,
      row.role_id,
    )
  }

  for (const row of all('SELECT id, permission_id, user_id FROM permission_user ORDER BY id')) {
    db.prepare('INSERT INTO permission_user (id, permission_id, user_id) VALUES (?, ?, ?)').run(
      row.id,
      row.permission_id,
      row.user_id,
    )
  }

  for (const row of all(
    `SELECT id, code, name, level, monthly_salary, is_active, sort_order, description, created_at, updated_at
     FROM ranks ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO ranks (id, code, name, level, salary, is_active, sort_order, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.code,
      row.name,
      row.level,
      row.monthly_salary,
      row.is_active,
      row.sort_order,
      row.description,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, name, email, email_verified_at, password, remember_token, created_at, updated_at,
            member_code, sponsor_id, current_rank_id, status, verification_status, suspended_at,
            suspension_reason, phone, registered_at
     FROM users ORDER BY id`,
  )) {
    let hash = String(row.password)
    if (hash.startsWith('$2y$')) {
      hash = '$2b$' + hash.slice(4)
      rehashed += 1
    }
    db.prepare(
      `INSERT INTO users (id, name, email, email_verified_at, password_hash, remember_token,
        created_at, updated_at, member_code, sponsor_id, current_rank_id, status,
        verification_status, suspended_at, suspension_reason, phone, registered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.name,
      row.email,
      row.email_verified_at,
      hash,
      row.remember_token,
      row.created_at,
      row.updated_at,
      row.member_code,
      row.sponsor_id,
      row.current_rank_id,
      row.status,
      row.verification_status,
      row.suspended_at,
      row.suspension_reason,
      row.phone,
      row.registered_at,
    )
  }

  for (const row of all('SELECT user_id, role_id FROM role_user ORDER BY user_id')) {
    db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(row.user_id, row.role_id)
  }

  for (const row of all('SELECT id, ancestor_id, descendant_id, depth, created_at FROM referral_closures ORDER BY id')) {
    db.prepare('INSERT INTO referral_closures (ancestor_id, descendant_id, depth, created_at) VALUES (?, ?, ?, ?)').run(
      row.ancestor_id,
      row.descendant_id,
      row.depth,
      row.created_at,
    )
  }

  for (const row of all('SELECT id, sponsor_id, member_id, depth, created_at FROM referral_edges ORDER BY id')) {
    db.prepare(
      'INSERT INTO referral_edges (id, sponsor_id, member_id, depth, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(row.id, row.sponsor_id, row.member_id, row.depth, row.created_at)
  }

  for (const row of all(
    `SELECT id, member_id, balance, pending_balance, lifetime_credited, lifetime_debited,
            currency, status, last_reconciled_at, created_at, updated_at
     FROM wallet_accounts ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO wallet_accounts (id, member_id, balance, pending_balance, lifetime_credited,
        lifetime_debited, currency, status, last_reconciled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.member_id,
      row.balance,
      row.pending_balance,
      row.lifetime_credited,
      row.lifetime_debited,
      row.currency,
      row.status,
      row.last_reconciled_at,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, user_id, full_name, country, city, address_line, nid_number, nid_document_path,
            selfie_document_path, emergency_contact, date_of_birth, referral_source, meta, created_at, updated_at
     FROM member_profiles ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO member_profiles (id, member_id, full_name, country, city, address_line, nid_number,
        nid_document_path, selfie_document_path, emergency_contact, date_of_birth, referral_source,
        meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.user_id,
      row.full_name,
      row.country,
      row.city,
      row.address_line,
      row.nid_number,
      row.nid_document_path,
      row.selfie_document_path,
      row.emergency_contact,
      row.date_of_birth,
      row.referral_source,
      row.meta,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, code, name, description, required_rank_id, threshold_amount, budget, is_active,
            max_claims, claimed_count, eligibility_from, eligibility_to, config, created_at, updated_at, image
     FROM rewards ORDER BY id`,
  )) {
    const image = row.image ? (String(row.image).startsWith('/') ? String(row.image) : `/${row.image}`) : null
    db.prepare(
      `INSERT INTO rewards (id, code, title, description, required_rank_id, threshold_amount, budget,
        active, max_claims, claimed_count, eligibility_from, eligibility_to, config, created_at,
        updated_at, image_path, cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.code,
      row.name,
      row.description,
      row.required_rank_id,
      row.threshold_amount,
      row.budget,
      row.is_active,
      row.max_claims,
      row.claimed_count,
      row.eligibility_from,
      row.eligibility_to,
      row.config,
      row.created_at,
      row.updated_at,
      image,
      row.threshold_amount ?? 0,
    )
  }

  for (const row of all(
    `SELECT id, name, version, status, effective_from, effective_to, eligible_transaction_types,
            commission_base, eligibility_requirements, notes, created_by, approved_by, approved_at,
            created_at, updated_at
     FROM compensation_plans ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO compensation_plans (id, name, version, status, is_active, effective_from, effective_to,
        eligible_transaction_types, commission_base, eligibility_requirements, notes, created_by,
        approved_by, approved_at, created_at, activated_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.name,
      row.version,
      row.status,
      row.status === 'active' ? 1 : 0,
      row.effective_from,
      row.effective_to,
      row.eligible_transaction_types,
      row.commission_base,
      row.eligibility_requirements,
      row.notes,
      row.created_by,
      row.approved_by,
      row.approved_at,
      row.created_at,
      row.approved_at,
      row.updated_at,
    )
  }

  for (const row of all(
    'SELECT id, compensation_plan_id, generation_from, generation_to, rate FROM generation_rates ORDER BY id',
  )) {
    db.prepare(
      `INSERT INTO compensation_plan_rates (id, plan_id, generation_from, generation_to, rate)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(row.id, row.compensation_plan_id, row.generation_from, row.generation_to, row.rate)
  }

  const rankCode = new Map(
    all<{ id: number; code: string }>('SELECT id, code FROM ranks').map((row) => [row.id, row.code]),
  )
  const directLinks = new Map<number, number>()
  const downlineVolume = new Map<number, number>()
  for (const row of all<{ id: number; rank_id: number; type: string; value: number; target_rank_id: number | null; period: string; require_separate_branches: number; label: string; sort_order: number; created_at: string; updated_at: string }>(
    `SELECT id, rank_id, type, value, target_rank_id, period, require_separate_branches, label, sort_order,
            created_at, updated_at
     FROM rank_requirements ORDER BY rank_id, sort_order, id`,
  )) {
    if (row.type === 'min_direct_links') directLinks.set(row.rank_id, Number(row.value ?? 0))
    if (row.type === 'downline_volume') downlineVolume.set(row.rank_id, Number(row.value ?? 0))

    db.prepare(
      `INSERT INTO rank_requirements (id, rank_id, type, value, label, target_rank_code, target_rank_id,
        period, require_separate_branches, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.rank_id,
      row.type,
      row.value,
      row.label,
      row.target_rank_id ? rankCode.get(row.target_rank_id) ?? null : null,
      row.target_rank_id,
      row.period,
      row.require_separate_branches,
      row.sort_order,
      row.created_at,
      row.updated_at,
    )
  }

  for (const [rankId, value] of directLinks) {
    db.prepare('UPDATE ranks SET min_direct_links = ? WHERE id = ?').run(value, rankId)
  }
  for (const [rankId, value] of downlineVolume) {
    db.prepare('UPDATE ranks SET downline_volume = ? WHERE id = ?').run(value, rankId)
  }

  for (const row of all(
    `SELECT id, reference, member_id, type, description, gross_amount, eligible_amount, currency, status,
            verified_by, verified_at, commissioned_by_job_run_id, commissioned_at, reversal_of_id, notes,
            created_at, updated_at
     FROM business_transactions ORDER BY id`,
  )) {
    const status = row.status === 'verified' ? 'approved' : row.status
    db.prepare(
      `INSERT INTO business_transactions (id, reference, member_id, type, description, gross_amount,
        eligible_amount, amount, currency, status, verified_by, verified_at, commissioned_by_job_run_id,
        commissioned_at, reversal_of_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.reference,
      row.member_id,
      row.type,
      row.description,
      row.gross_amount,
      row.eligible_amount,
      row.eligible_amount,
      row.currency,
      status,
      row.verified_by,
      row.verified_at,
      row.commissioned_by_job_run_id,
      row.commissioned_at,
      row.reversal_of_id,
      row.notes,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, rank_id, amount, currency, is_active, period_type, notes, created_at, updated_at
     FROM salary_rules ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO salary_rules (id, rank_id, amount, currency, is_active, period_type, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.rank_id,
      row.amount,
      row.currency,
      row.is_active,
      row.period_type,
      row.notes,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, user_id, action, auditable_type, auditable_id, old_values, new_values, ip_address,
            user_agent, created_at, updated_at
     FROM audit_logs ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO audit_logs (id, actor_id, action, subject_type, subject_id, payload, old_values,
        new_values, ip_address, user_agent, auditable_type, auditable_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.user_id,
      row.action,
      row.auditable_type,
      row.auditable_id,
      row.new_values,
      row.old_values,
      row.new_values,
      row.ip_address,
      row.user_agent,
      row.auditable_type,
      row.auditable_id,
      row.created_at,
      row.updated_at,
    )
  }

  for (const row of all(
    `SELECT id, key, value, "group" AS group_name, type, description, is_secret, created_at, updated_at
     FROM application_settings ORDER BY id`,
  )) {
    db.prepare(
      `INSERT INTO application_settings (id, key, value, group_name, type, description, is_secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.key,
      row.value,
      row.group_name,
      row.type,
      row.description,
      row.is_secret,
      row.created_at,
      row.updated_at,
    )
  }

  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally {
  db.exec('PRAGMA foreign_keys = ON;')
}

const CHECKS: Array<[string, string]> = [
  ['users', 'users'],
  ['roles', 'roles'],
  ['permissions', 'permissions'],
  ['permission_role', 'permission_role'],
  ['user_roles', 'role_user'],
  ['wallet_accounts', 'wallet_accounts'],
  ['referral_closures', 'referral_closures'],
  ['referral_edges', 'referral_edges'],
  ['business_transactions', 'business_transactions'],
  ['ranks', 'ranks'],
  ['rank_requirements', 'rank_requirements'],
  ['rewards', 'rewards'],
  ['compensation_plans', 'compensation_plans'],
  ['compensation_plan_rates', 'generation_rates'],
  ['member_profiles', 'member_profiles'],
  ['application_settings', 'application_settings'],
  ['salary_rules', 'salary_rules'],
  ['audit_logs', 'audit_logs'],
]

let mismatches = 0
for (const [target, source] of CHECKS) {
  const a = (db.prepare(`SELECT COUNT(*) AS c FROM ${target}`).get() as { c: number }).c
  const b = (src.prepare(`SELECT COUNT(*) AS c FROM ${source}`).get() as { c: number }).c
  const ok = a === b
  if (!ok) mismatches += 1
  console.log(`${ok ? '[ok]' : '[!!]'} ${target}: ${a} (laravel ${source}: ${b})`)
}

const demo = db.prepare("SELECT email, password_hash FROM users WHERE email = 'root@demo.test'").get() as
  | { email: string; password_hash: string }
  | undefined
const passwordOk = demo ? bcrypt.compareSync('Password1!', demo.password_hash) : false
console.log(`[import-laravel] demo password verifies: ${passwordOk} (bcrypt re-encoded ${rehashed} hashes)`)

if (mismatches > 0 || !passwordOk) process.exitCode = 1
console.log('[import-laravel] complete')
