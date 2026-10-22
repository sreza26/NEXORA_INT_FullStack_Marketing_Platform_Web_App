import { db } from '../db/index.js'
import { config, type GenerationRate } from '../config/index.js'
import { postLedger, reverseLedger } from '../models/ledger.js'
import { generateCommissions } from './commission.js'
import { directReferrals, downlineByGeneration } from './tree.js'
import { rebuildAllReferralClosures } from './closure.js'

export const MEMBER_STATUSES = ['active', 'inactive', 'suspended', 'terminated']
export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected']
export const TRANSACTION_STATUSES = ['pending', 'verified', 'rejected', 'refunded', 'chargeback']
export const TRANSACTION_TYPES = ['sale', 'deposit', 'other']
export const LEDGER_TYPES = ['deposit', 'commission', 'salary', 'withdrawal', 'adjustment', 'reversal']
export const WITHDRAWAL_STATUSES = ['pending', 'approved', 'paid', 'rejected', 'reversed']
export const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'rejected', 'reversed']
export const SALARY_STATUSES = ['pending', 'approved', 'paid', 'rejected']
export const DEPOSIT_STATUSES = ['pending', 'verified', 'rejected']
export const JOB_STATUSES = ['running', 'success', 'failed']
export const ANNOUNCEMENT_SEVERITIES = ['info', 'success', 'warning', 'error']
export const ANNOUNCEMENT_AUDIENCES = ['all', 'members', 'admins']

export const SETTING_TOGGLES: Array<{ key: string; label: string; description: string; env: string | null; default: boolean }> = [
  { key: 'deposits.enabled', label: 'Deposit submissions', description: 'Members can submit deposit records.', env: 'NEXORA_DEPOSITS_ENABLED', default: true },
  { key: 'deposits.commissionable', label: 'Deposits count as commissionable sales', description: 'Deposit volume feeds generation commissions.', env: null, default: false },
  { key: 'commission.processing_enabled', label: 'Live commission processing', description: 'Commissions are generated as soon as a transaction is verified.', env: null, default: true },
  { key: 'profit_share.enabled', label: 'NDC 1% profit share', description: 'NDC rank members receive a 1% profit share.', env: null, default: false },
  { key: 'rank.require_separate_branches', label: 'CountOfRank on separate branches', description: 'Rank achievements count only distinct downline branches.', env: 'NEXORA_SEPARATE_BRANCHES', default: false },
  { key: 'referral.allow_registration_without_sponsor', label: 'Registration without a sponsor', description: 'Members may register without a referral code.', env: 'NEXORA_ALLOW_ORPHAN_REGISTRATION', default: true },
  { key: 'legal.review_completed', label: 'Compliance review completed', description: 'Marks the legal review as finished.', env: null, default: false },
]

export function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function scalar(value: unknown): number | string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return String(value)
}

export function transactionStatus(raw: string | null | undefined): string {
  if (raw === 'approved') return 'verified'
  return raw ?? 'pending'
}

export function ledgerStatus(raw: string | null | undefined): string {
  if (raw === 'approved') return 'completed'
  return raw ?? 'completed'
}

export function recordAudit(
  actorId: number,
  action: string,
  subjectType: string | null,
  subjectId: number | null,
  payload: unknown,
  ipAddress?: string | null,
): void {
  const body = JSON.stringify(payload ?? {})
  db.prepare(
    `INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload, auditable_type, auditable_id, new_values, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(actorId, action, subjectType, subjectId, body, subjectType, subjectId, body, ipAddress ?? null)
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined || value === '') return null
  try {
    const parsed = JSON.parse(String(value))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function paginate<T>(items: T[], total: number, page: number, perPage: number) {
  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export function pageParams(page?: unknown, perPage?: unknown): { page: number; perPage: number } {
  const p = Math.max(1, num(page) || 1)
  const size = Math.min(Math.max(num(perPage) || 25, 1), 200)
  return { page: p, perPage: size }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export function countRows(sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...(params as never[])) as { c: number } | undefined
  return num(row?.c)
}

export function sumOf(sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...(params as never[])) as { t: number } | undefined
  return num(row?.t)
}

export function walletTotals(): { balance: number; pending: number; credited: number; debited: number } {
  return {
    balance: sumOf('SELECT COALESCE(SUM(balance), 0) AS t FROM wallet_accounts'),
    pending: sumOf(
      `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS t
       FROM ledger_entries WHERE status = 'pending'`,
    ),
    credited: sumOf(
      `SELECT COALESCE(SUM(amount), 0) AS t FROM ledger_entries WHERE direction = 'credit' AND status <> 'reversed'`,
    ),
    debited: sumOf(
      `SELECT COALESCE(SUM(amount), 0) AS t FROM ledger_entries WHERE direction = 'debit' AND status <> 'reversed'`,
    ),
  }
}

export function platformVolume(): number {
  return round2(
    sumOf(
      `SELECT COALESCE(SUM(eligible_amount), 0) AS t FROM business_transactions WHERE status IN ('verified', 'approved')`,
    ),
  )
}

export function monthlySeries(months = 6): { labels: string[]; registrations: number[]; volume: number[] } {
  const labels: string[] = []
  const registrations: number[] = []
  const volume: number[] = []
  const now = new Date()

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    labels.push(key)
    registrations.push(
      countRows('SELECT COUNT(*) AS c FROM users WHERE substr(COALESCE(registered_at, created_at), 1, 7) = ?', key),
    )
    volume.push(
      round2(
        sumOf(
          `SELECT COALESCE(SUM(eligible_amount), 0) AS t FROM business_transactions
           WHERE substr(created_at, 1, 7) = ? AND status IN ('verified', 'approved')`,
          key,
        ),
      ),
    )
  }

  return { labels, registrations, volume }
}

export function pendingCounts() {
  return {
    pendingVerifications: countRows(`SELECT COUNT(*) AS c FROM users WHERE verification_status = 'pending'`),
    pendingTransactions: countRows(`SELECT COUNT(*) AS c FROM business_transactions WHERE status = 'pending'`),
    pendingCommissions: countRows(`SELECT COUNT(*) AS c FROM commissions WHERE status = 'pending'`),
    pendingSalary: countRows(`SELECT COUNT(*) AS c FROM salary_payouts WHERE status = 'pending'`),
    pendingWithdrawals: countRows(`SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = 'pending'`),
  }
}

export function jobRunRows(limit = 10) {
  return db
    .prepare(
      `SELECT id, job_name, status, processed_count, started_at, finished_at, host, error_message
       FROM scheduled_job_runs ORDER BY COALESCE(started_at, created_at) DESC, id DESC LIMIT ?`,
    )
    .all(limit) as unknown as Array<Record<string, unknown>>
}

export function platformSummary() {
  const members = countRows(`SELECT COUNT(*) AS c FROM users WHERE status <> 'terminated'`)
  const activeMembers = countRows(`SELECT COUNT(*) AS c FROM users WHERE status = 'active'`)
  const pending = pendingCounts()
  const series = monthlySeries(6)

  return {
    members,
    activeMembers,
    ...pending,
    platformVolume: platformVolume(),
    walletTotals: walletTotals(),
    recentJobRuns: jobRunRows(10),
    months: 6,
    registrations: { labels: series.labels, values: series.registrations },
    volume: { labels: series.labels, values: series.volume },
  }
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export function listMembersPage(input: { q?: string; status?: string; verification?: string; page?: number; perPage?: number }) {
  const { page, perPage } = pageParams(input.page, input.perPage)
  const where: string[] = []
  const params: unknown[] = []
  const search = (input.q ?? '').trim()

  if (search) {
    where.push('(lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(u.member_code) LIKE ?)')
    const like = `%${search.toLowerCase()}%`
    params.push(like, like, like)
  }
  if (input.status) {
    where.push('u.status = ?')
    params.push(input.status)
  }
  if (input.verification) {
    where.push('u.verification_status = ?')
    params.push(input.verification)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = countRows(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, ...params)

  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.member_code, u.status, u.verification_status, u.registered_at, u.created_at,
              u.sponsor_id, u.current_rank_id, r.name AS rank_name, s.name AS sponsor_name, s.member_code AS sponsor_code
       FROM users u
       LEFT JOIN ranks r ON r.id = u.current_rank_id
       LEFT JOIN users s ON s.id = u.sponsor_id
       ${whereSql}
       ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...(params as never[]), perPage, (page - 1) * perPage) as unknown as Array<Record<string, unknown>>

  return {
    ...paginate(rows, total, page, perPage),
    statuses: MEMBER_STATUSES,
    verifications: VERIFICATION_STATUSES,
  }
}

export function memberDetail(id: number) {
  const member = db
    .prepare(
      `SELECT u.*, r.name AS rank_name FROM users u LEFT JOIN ranks r ON r.id = u.current_rank_id WHERE u.id = ?`,
    )
    .get(id) as unknown as Record<string, unknown> | undefined
  if (!member) return null

  const profile = (db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(id) as unknown as Record<string, unknown>) ?? {}
  const roles = (
    db
      .prepare('SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.name')
      .all(id) as unknown as Array<{ name: string }>
  ).map((r) => r.name)

  const sponsor = member.sponsor_id
    ? (db.prepare('SELECT id, name, member_code FROM users WHERE id = ?').get(member.sponsor_id) as unknown as Record<string, unknown>)
    : null

  const direct = db
    .prepare(
      `SELECT u.id, u.name, u.member_code, u.registered_at, u.created_at, r.name AS rank_name
       FROM users u LEFT JOIN ranks r ON r.id = u.current_rank_id
       WHERE u.sponsor_id = ? ORDER BY u.id ASC LIMIT 30`,
    )
    .all(id) as unknown as Array<Record<string, unknown>>

  const generations = downlineByGeneration(id)
  const downlineCount = [...generations.values()].reduce((total, ids) => total + ids.length, 0)

  const volume = round2(
    sumOf(
      `SELECT COALESCE(SUM(bt.eligible_amount), 0) AS t
       FROM business_transactions bt
       JOIN referral_closures rc ON rc.descendant_id = bt.member_id
       WHERE rc.ancestor_id = ? AND bt.status IN ('verified', 'approved')`,
      id,
    ),
  )

  const recentTransactions = db
    .prepare(
      `SELECT id, reference, gross_amount, eligible_amount, amount, type, description, status, created_at
       FROM business_transactions WHERE member_id = ? ORDER BY id DESC LIMIT 10`,
    )
    .all(id) as unknown as Array<Record<string, unknown>>

  return {
    member: {
      ...member,
      roles,
      sponsor,
      rank_name: member.rank_name ?? null,
      profile,
    },
    directReferrals: direct,
    downlineCount,
    lifetimeVolume: volume,
    recentTransactions: recentTransactions.map((t) => ({ ...t, status: transactionStatus(t.status as string) })),
  }
}

export function updateMemberDetails(
  id: number,
  data: {
    name: string
    email: string
    phone?: string | null
    status: string
    country?: string | null
    city?: string | null
    address_line?: string | null
    emergency_contact?: string | null
  },
) {
  const member = db.prepare('SELECT status FROM users WHERE id = ?').get(id) as { status: string } | undefined
  if (!member) return null

  const previousStatus = member.status
  const suspended = data.status === 'suspended'

  db.prepare(
    `UPDATE users SET name = ?, email = ?, phone = ?, status = ?, suspended_at = ?, suspension_reason = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.name,
    data.email.toLowerCase(),
    data.phone || null,
    data.status,
    suspended ? nowStamp() : null,
    suspended ? 'Updated via admin profile edit.' : null,
    id,
  )

  db.prepare(
    `INSERT INTO member_profiles (member_id, full_name, country, city, address_line, emergency_contact, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(member_id) DO UPDATE SET
       full_name = excluded.full_name,
       country = excluded.country,
       city = excluded.city,
       address_line = excluded.address_line,
       emergency_contact = excluded.emergency_contact,
       updated_at = datetime('now')`,
  ).run(id, data.name, data.country || null, data.city || null, data.address_line || null, data.emergency_contact || null)

  return { previousStatus }
}

export function verifyMemberIdentity(id: number, decision: 'verified' | 'rejected') {
  db.prepare(`UPDATE users SET verification_status = ?, updated_at = datetime('now') WHERE id = ?`).run(decision, id)
}

export function suspendMember(id: number, reason: string) {
  db.prepare(
    `UPDATE users SET status = 'suspended', suspended_at = datetime('now'), suspension_reason = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(reason, id)
}

export function activateMember(id: number) {
  db.prepare(
    `UPDATE users SET status = 'active', suspended_at = NULL, suspension_reason = NULL, updated_at = datetime('now') WHERE id = ?`,
  ).run(id)
}

export function changeSponsor(id: number, sponsorId: number) {
  db.prepare(`UPDATE users SET sponsor_id = ?, updated_at = datetime('now') WHERE id = ?`).run(sponsorId, id)
  rebuildAllReferralClosures()
}

export function deleteMember(id: number) {
  const member = db.prepare('SELECT name, email, member_code, status FROM users WHERE id = ?').get(id) as
    | { name: string; email: string; member_code: string; status: string }
    | undefined
  if (!member) return null

  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  rebuildAllReferralClosures()
  return member
}

export function pendingVerifications() {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.member_code, u.phone, u.updated_at, u.created_at,
              p.full_name, p.nid_number, p.country, p.city, p.nid_document_path, p.selfie_document_path
       FROM users u LEFT JOIN member_profiles p ON p.member_id = u.id
       WHERE u.verification_status = 'pending'
       ORDER BY u.updated_at DESC, u.id DESC`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  return { items: rows, total: rows.length }
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export function rolesOverview(search = '') {
  const roles = db
    .prepare(
      `SELECT r.id, r.name, (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permissions_count
       FROM roles r ORDER BY r.name`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const like = `%${search.trim().toLowerCase()}%`
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email,
              (SELECT GROUP_CONCAT(r.name) FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = u.id) AS role_names
       FROM users u
       WHERE (? = '' OR lower(u.name) LIKE ? OR lower(u.email) LIKE ?)
       ORDER BY u.id DESC LIMIT 200`,
    )
    .all(search.trim(), like, like) as unknown as Array<Record<string, unknown>>

  return {
    roles,
    users: users.map((u) => ({
      ...u,
      roles: u.role_names ? String(u.role_names).split(',') : [],
    })),
  }
}

export function assignRole(userId: number, role: string) {
  const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number } | undefined
  if (!roleRow) return false
  db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)
  if (role !== 'member') {
    db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleRow.id)
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export function transactionsPage(input: { q?: string; status?: string; page?: number; perPage?: number }) {
  const { page, perPage } = pageParams(input.page, input.perPage)
  const where: string[] = []
  const params: unknown[] = []
  const search = (input.q ?? '').trim()

  if (search) {
    where.push('(lower(t.reference) LIKE ? OR lower(u.name) LIKE ? OR lower(u.member_code) LIKE ?)')
    const like = `%${search.toLowerCase()}%`
    params.push(like, like, like)
  }
  if (input.status) {
    where.push('t.status = ?')
    params.push(input.status === 'verified' ? 'approved' : input.status)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = countRows(
    `SELECT COUNT(*) AS c FROM business_transactions t JOIN users u ON u.id = t.member_id ${whereSql}`,
    ...(params as unknown[]),
  )

  const rows = db
    .prepare(
      `SELECT t.id, t.member_id, t.reference, t.gross_amount, t.eligible_amount, t.amount, t.type, t.description,
              t.status, t.created_at, t.verified_at, u.name AS member_name, u.member_code
       FROM business_transactions t JOIN users u ON u.id = t.member_id
       ${whereSql} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...(params as never[]), perPage, (page - 1) * perPage) as unknown as Array<Record<string, unknown>>

  return {
    ...paginate(
      rows.map((t) => ({ ...t, status: transactionStatus(t.status as string) })),
      total,
      page,
      perPage,
    ),
    statuses: TRANSACTION_STATUSES,
    types: TRANSACTION_TYPES,
  }
}

export function createTransaction(input: {
  memberCode: string
  type: string
  grossAmount: number
  eligibleAmount: number
  description?: string | null
}) {
  const member = db
    .prepare('SELECT id, name, member_code FROM users WHERE member_code = ?')
    .get(input.memberCode.trim().toUpperCase()) as { id: number; name: string; member_code: string } | undefined
  if (!member) return null

  const reference = `TXN-${Date.now()}-${member.id}`
  const info = db
    .prepare(
      `INSERT INTO business_transactions (member_id, reference, gross_amount, eligible_amount, amount, type, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .run(
      member.id,
      reference,
      input.grossAmount,
      input.eligibleAmount,
      input.grossAmount,
      input.type,
      input.description || null,
    )

  return { id: Number(info.lastInsertRowid), reference, member }
}

export function verifyTransaction(id: number, eligibleAmount?: number | null) {
  const transaction = db.prepare('SELECT * FROM business_transactions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!transaction) return null

  const eligible = eligibleAmount === undefined || eligibleAmount === null ? num(transaction.eligible_amount) : eligibleAmount
  db.prepare(
    `UPDATE business_transactions SET status = 'approved', eligible_amount = ?, amount = ?, verified_at = datetime('now') WHERE id = ?`,
  ).run(eligible, num(transaction.gross_amount) || eligible, id)

  return { id, eligible, memberId: num(transaction.member_id) }
}

export function rejectTransaction(id: number) {
  db.prepare(`UPDATE business_transactions SET status = 'rejected' WHERE id = ?`).run(id)
}

export function reverseTransaction(id: number) {
  const transaction = db.prepare('SELECT * FROM business_transactions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!transaction) return null

  db.prepare(`UPDATE business_transactions SET status = 'refunded' WHERE id = ?`).run(id)
  db.prepare(
    `UPDATE commissions SET status = 'reversed', amount = -amount WHERE source_transaction_id = ? AND status <> 'reversed'`,
  ).run(id)

  const commissions = db
    .prepare('SELECT * FROM commissions WHERE source_transaction_id = ?')
    .all(id) as unknown as Array<Record<string, unknown>>
  for (const commission of commissions) {
    if (commission.status === 'reversed') {
      reverseLedger('commission', num(commission.id), `Commission #${commission.id} reversed with transaction`)
    }
  }

  return { id }
}

/* ------------------------------------------------------------------ */
/* Ledger, deposits, withdrawals                                      */
/* ------------------------------------------------------------------ */

export function ledgerEntries(input: { q?: string; type?: string }) {
  const where: string[] = []
  const params: unknown[] = []
  const search = (input.q ?? '').trim()

  if (search) {
    where.push('(lower(l.description) LIKE ? OR lower(l.reference_type) LIKE ? OR lower(u.name) LIKE ? OR lower(u.member_code) LIKE ?)')
    const like = `%${search.toLowerCase()}%`
    params.push(like, like, like, like)
  }
  if (input.type) {
    where.push('l.type = ?')
    params.push(input.type)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `SELECT l.id, l.member_id, l.type, l.direction, l.amount, l.balance_after, l.reference_type, l.reference_id,
              l.description, l.status, l.created_at, u.name AS member_name, u.member_code
       FROM ledger_entries l JOIN users u ON u.id = l.member_id
       ${whereSql} ORDER BY l.id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  return {
    items: rows.map((row) => ({ ...row, status: ledgerStatus(row.status as string) })),
    total: rows.length,
    types: LEDGER_TYPES,
  }
}

export function depositsPage(status?: string) {
  const params: unknown[] = []
  let where = ''
  if (status) {
    where = 'WHERE d.status = ?'
    params.push(status)
  }
  const rows = db
    .prepare(
      `SELECT d.id, d.member_id, d.reference, d.amount, d.currency, d.method, d.status, d.hold_until, d.notes,
              d.submitted_at, d.created_at, u.name AS member_name, u.member_code
       FROM deposits d JOIN users u ON u.id = d.member_id
       ${where} ORDER BY d.id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  return {
    items: rows,
    total: rows.length,
    statuses: DEPOSIT_STATUSES,
    policyEnabled: settingBool('deposits.enabled', true),
    holdDays: config.withdrawal.holdDays,
  }
}

export function verifyDeposit(id: number) {
  db.prepare(`UPDATE deposits SET status = 'verified', verified_at = datetime('now') WHERE id = ?`).run(id)
}

export function rejectDeposit(id: number) {
  db.prepare(`UPDATE deposits SET status = 'rejected' WHERE id = ?`).run(id)
}

export function withdrawalsList(status?: string) {
  const params: unknown[] = []
  let where = ''
  if (status) {
    where = 'WHERE w.status = ?'
    params.push(status)
  }
  const rows = db
    .prepare(
      `SELECT w.id, w.member_id, w.amount, w.method, w.account_details, w.status, w.notes, w.requested_at, w.created_at,
              w.processed_at, w.paid_at, w.reference, w.review_note, u.name AS member_name, u.member_code
       FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
       ${where} ORDER BY w.id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  return rows
}

export function approveWithdrawalRequest(id: number, adminId: number, note?: string | null) {
  const request = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!request) return null
  if (request.status !== 'pending') return null

  db.prepare(
    `UPDATE withdrawal_requests SET status = 'approved', processed_at = datetime('now'), processed_by = ?,
       notes = COALESCE(?, notes), review_note = COALESCE(?, review_note) WHERE id = ?`,
  ).run(adminId, note ?? null, note ?? null, id)
  db.prepare(`UPDATE ledger_entries SET status = 'approved' WHERE reference_type = 'withdrawal_request' AND reference_id = ?`).run(id)
  return { id, status: 'approved' }
}

export function rejectWithdrawalRequest(id: number, adminId: number, reason?: string | null) {
  const request = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!request) return null
  if (request.status !== 'pending') return null

  reverseLedger('withdrawal_request', id, `Withdrawal request #${id} rejected`)
  db.prepare(
    `UPDATE withdrawal_requests SET status = 'rejected', processed_at = datetime('now'), processed_by = ?,
       notes = COALESCE(?, notes), review_note = COALESCE(?, review_note) WHERE id = ?`,
  ).run(adminId, reason ?? null, reason ?? null, id)
  return { id, status: 'rejected' }
}

export function payWithdrawalRequest(id: number, adminId: number) {
  const request = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!request) return null
  if (request.status !== 'approved') return null

  db.prepare(
    `UPDATE withdrawal_requests SET status = 'paid', paid_at = datetime('now'), processed_at = datetime('now'), processed_by = ? WHERE id = ?`,
  ).run(adminId, id)
  return { id, status: 'paid' }
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

export function reconciliationRecords(limit = 200) {
  const rows = db
    .prepare(
      `SELECT r.id, r.member_id, r.expected_balance, r.ledger_sum, r.difference, r.status, r.notes, r.run_at,
              u.name AS member_name, u.member_code
       FROM reconciliation_records r LEFT JOIN users u ON u.id = r.member_id
       ORDER BY r.id DESC LIMIT ?`,
    )
    .all(limit) as unknown as Array<Record<string, unknown>>

  return { items: rows, total: rows.length }
}

export function runReconciliation() {
  const wallets = db
    .prepare(
      `SELECT w.member_id, w.balance, u.name AS member_name FROM wallet_accounts w JOIN users u ON u.id = w.member_id`,
    )
    .all() as unknown as Array<{ member_id: number; balance: number; member_name: string }>

  let mismatches = 0
  const insert = db.prepare(
    `INSERT INTO reconciliation_records (member_id, expected_balance, ledger_sum, difference, status, notes, run_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
  )

  for (const wallet of wallets) {
    const ledgerSum = round2(
      sumOf(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS t
         FROM ledger_entries WHERE member_id = ? AND status <> 'reversed'`,
        wallet.member_id,
      ),
    )
    const expected = round2(num(wallet.balance))
    const difference = round2(expected - ledgerSum)
    const status = difference === 0 ? 'match' : 'mismatch'
    if (status !== 'match') mismatches += 1
    insert.run(wallet.member_id, expected, ledgerSum, difference, status, status === 'match' ? null : 'Balance differs from the ledger sum')
  }

  return { checked: wallets.length, mismatches }
}

/* ------------------------------------------------------------------ */
/* Compensation plans                                                  */
/* ------------------------------------------------------------------ */

export function listPlans() {
  const plans = db
    .prepare('SELECT * FROM compensation_plans ORDER BY version DESC, id DESC')
    .all() as unknown as Array<Record<string, unknown>>

  const rates = db
    .prepare('SELECT * FROM compensation_plan_rates ORDER BY plan_id ASC, generation_from ASC')
    .all() as unknown as Array<Record<string, unknown>>

  return plans.map((plan) => ({
    ...plan,
    eligible_transaction_types: plan.eligible_transaction_types
      ? String(plan.eligible_transaction_types).split(',').filter(Boolean)
      : [],
    created_by_name: (db.prepare('SELECT name FROM users WHERE id = ?').get(plan.created_by as number | undefined) as { name: string } | undefined)?.name ?? 'system',
    approved_by_name: (db.prepare('SELECT name FROM users WHERE id = ?').get(plan.approved_by as number | undefined) as { name: string } | undefined)?.name ?? null,
    rates: rates
      .filter((rate) => rate.plan_id === plan.id)
      .map((rate) => ({
        generation_from: num(rate.generation_from),
        generation_to: num(rate.generation_to),
        rate: num(rate.rate),
      })),
  }))
}

export function planDetail(id: number) {
  const plans = listPlans() as any[]
  return plans.find((plan) => plan.id === id) ?? null
}

export function activePlan() {
  const plan = db.prepare(`SELECT * FROM compensation_plans WHERE is_active = 1 ORDER BY version DESC LIMIT 1`).get() as
    | Record<string, unknown>
    | undefined
  if (!plan) return null
  const detail = planDetail(num(plan.id)) as any
  return detail ?? null
}

export function createPlan(
  input: {
    name: string
    commissionBase: string
    effectiveFrom?: string | null
    eligibleTypes: string[]
    notes?: string | null
    rates: Array<{ generation_from: number; generation_to: number; rate: number }>
  },
  adminId: number,
) {
  const version = num((db.prepare('SELECT COALESCE(MAX(version), 0) AS t FROM compensation_plans').get() as { t: number }).t) + 1

  const info = db
    .prepare(
      `INSERT INTO compensation_plans (version, name, status, is_active, commission_base, eligible_transaction_types,
         effective_from, notes, created_by)
       VALUES (?, ?, 'draft', 0, ?, ?, ?, ?, ?)`,
    )
    .run(
      version,
      input.name,
      input.commissionBase,
      input.eligibleTypes.join(','),
      input.effectiveFrom || null,
      input.notes || null,
      adminId,
    )

  const planId = Number(info.lastInsertRowid)
  const insertRate = db.prepare(
    'INSERT INTO compensation_plan_rates (plan_id, generation_from, generation_to, rate) VALUES (?, ?, ?, ?)',
  )
  for (const rate of input.rates) {
    insertRate.run(planId, rate.generation_from, rate.generation_to, rate.rate)
  }

  return planId
}

export function activatePlan(id: number, adminId: number) {
  db.prepare(`UPDATE compensation_plans SET status = 'archived', is_active = 0 WHERE is_active = 1`).run()
  db.prepare(
    `UPDATE compensation_plans SET status = 'active', is_active = 1, activated_at = datetime('now'), approved_at = datetime('now'), approved_by = ?
     WHERE id = ?`,
  ).run(adminId, id)
}

/* ------------------------------------------------------------------ */
/* Commissions                                                         */
/* ------------------------------------------------------------------ */

export function commissionsPage(input: { q?: string; status?: string; page?: number; perPage?: number }) {
  const { page, perPage } = pageParams(input.page, input.perPage)
  const where: string[] = []
  const params: unknown[] = []
  const search = (input.q ?? '').trim()

  if (search) {
    where.push('(lower(r.name) LIKE ? OR lower(r.member_code) LIKE ? OR lower(c.idempotency_key) LIKE ? OR lower(t.reference) LIKE ?)')
    const like = `%${search.toLowerCase()}%`
    params.push(like, like, like, like)
  }
  if (input.status) {
    where.push('c.status = ?')
    params.push(input.status)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = countRows(
    `SELECT COUNT(*) AS c FROM commissions c
     JOIN users r ON r.id = c.recipient_id
     LEFT JOIN business_transactions t ON t.id = c.source_transaction_id ${whereSql}`,
    ...(params as unknown[]),
  )

  const rows = db
    .prepare(
      `SELECT c.id, c.recipient_id, c.source_member_id, c.source_transaction_id, c.generation, c.amount, c.rate,
              c.status, c.created_at, c.idempotency_key, r.name AS recipient_name, r.member_code AS recipient_code,
              t.reference AS source_reference, su.name AS source_member_name
       FROM commissions c
       JOIN users r ON r.id = c.recipient_id
       LEFT JOIN business_transactions t ON t.id = c.source_transaction_id
       LEFT JOIN users su ON su.id = c.source_member_id
       ${whereSql} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...(params as never[]), perPage, (page - 1) * perPage) as unknown as Array<Record<string, unknown>>

  return { ...paginate(rows, total, page, perPage), statuses: COMMISSION_STATUSES }
}

export function commissionPreview(reference: string) {
  const transaction = db
    .prepare(
      `SELECT t.*, u.name AS member_name, u.member_code FROM business_transactions t JOIN users u ON u.id = t.member_id
       WHERE t.reference = ?`,
    )
    .get(reference.trim()) as unknown as Record<string, unknown> | undefined
  if (!transaction) return { transaction: null, preview: null }

  const plan = activePlan() as any
  const base =
    plan && plan.commission_base === 'gross_verified_amount'
      ? num(transaction.gross_amount)
      : num(transaction.eligible_amount)

  const rates: GenerationRate[] = plan
    ? plan.rates.map((rate: any) => ({
        generation_from: rate.generation_from,
        generation_to: rate.generation_to,
        rate: rate.rate,
      }))
    : config.commission.generationRates

  const memberId = num(transaction.member_id)
  const sponsors = db.prepare('SELECT id, sponsor_id FROM users WHERE id = ?').get(memberId) as
    | { id: number; sponsor_id: number | null }
    | undefined

  const recipients: Array<Record<string, unknown>> = []
  let currentSponsorId = sponsors?.sponsor_id ?? null
  let generation = 1
  const limit = Math.max(config.commission.generation, rates.reduce((max, r) => Math.max(max, r.generation_to), 0))

  while (currentSponsorId && generation <= limit) {
    const band = rates.find((r) => generation >= r.generation_from && generation <= r.generation_to)
    const rate = band ? band.rate : 0
    const ancestor = db.prepare('SELECT id, name, status FROM users WHERE id = ?').get(currentSponsorId) as
      | { id: number; name: string; status: string }
      | undefined
    recipients.push({
      generation,
      ancestor_name: ancestor?.name ?? '—',
      eligible: ancestor?.status === 'active',
      rate,
      amount: round2(base * (rate / 100)),
    })
    const next = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(currentSponsorId) as
      | { sponsor_id: number | null }
      | undefined
    currentSponsorId = next?.sponsor_id ?? null
    generation += 1
  }

  return {
    transaction: { ...transaction, status: transactionStatus(transaction.status as string) },
    preview: {
      base: round2(base),
      plan: plan ? { id: plan.id, name: plan.name, version: plan.version } : null,
      recipients,
    },
  }
}

export function commissionRow(id: number) {
  return db.prepare('SELECT * FROM commissions WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined
}

export function approveCommission(id: number, adminId: number) {
  const commission = commissionRow(id)
  if (!commission) return null
  if (commission.status !== 'pending') return null

  const amount = num(commission.amount)
  postLedger({
    memberId: num(commission.recipient_id),
    type: 'commission',
    direction: 'credit',
    amount,
    referenceType: 'commission',
    referenceId: id,
    description: `Generation ${num(commission.generation)} commission`,
  })

  db.prepare(`UPDATE commissions SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(
    adminId,
    id,
  )
  return { id, status: 'approved' }
}

export function rejectCommission(id: number, adminId: number, reason?: string | null) {
  const commission = commissionRow(id)
  if (!commission) return null
  if (commission.status !== 'pending') return null

  reverseLedger('commission', id, `Commission #${id} rejected`)
  db.prepare(
    `UPDATE commissions SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), rejection_reason = ? WHERE id = ?`,
  ).run(adminId, reason ?? null, id)
  return { id, status: 'rejected' }
}

export function payCommission(id: number) {
  const commission = commissionRow(id)
  if (!commission) return null
  if (commission.status !== 'approved') return null
  db.prepare(`UPDATE commissions SET status = 'paid', paid_at = datetime('now') WHERE id = ?`).run(id)
  return { id, status: 'paid' }
}

export function commissionExceptions() {
  const reversed = db
    .prepare(
      `SELECT c.id, c.amount, c.recipient_id, u.name AS recipient_name, t.reference AS source_reference
       FROM commissions c LEFT JOIN users u ON u.id = c.recipient_id
       LEFT JOIN business_transactions t ON t.id = c.source_transaction_id
       WHERE c.status = 'reversed' ORDER BY c.id DESC LIMIT 100`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const negative = db
    .prepare(
      `SELECT c.id, c.amount, c.recipient_id, u.name AS recipient_name, t.reference AS source_reference
       FROM commissions c LEFT JOIN users u ON u.id = c.recipient_id
       LEFT JOIN business_transactions t ON t.id = c.source_transaction_id
       WHERE c.amount < 0 ORDER BY c.id DESC LIMIT 100`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const stuck = db
    .prepare(
      `SELECT t.id, t.reference, t.eligible_amount, t.verified_at, u.name AS member_name, u.member_code
       FROM business_transactions t JOIN users u ON u.id = t.member_id
       WHERE t.status IN ('verified', 'approved')
         AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.source_transaction_id = t.id)
         AND t.verified_at IS NOT NULL
         AND t.verified_at <= datetime('now', '-1 day')
       ORDER BY t.id DESC LIMIT 100`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  return {
    reversed: { items: reversed, total: reversed.length },
    negative: { items: negative, total: negative.length },
    stuck: { items: stuck, total: stuck.length },
  }
}

/* ------------------------------------------------------------------ */
/* Ranks                                                               */
/* ------------------------------------------------------------------ */

export function ranksAdmin() {
  const ranks = db.prepare('SELECT * FROM ranks ORDER BY level ASC').all() as unknown as Array<Record<string, unknown>>
  const requirements = db
    .prepare('SELECT * FROM rank_requirements ORDER BY rank_id ASC, sort_order ASC')
    .all() as unknown as Array<Record<string, unknown>>
  const targets = db.prepare('SELECT id, name FROM ranks').all() as unknown as Array<{ id: number; name: string }>

  return ranks.map((rank) => ({
    ...rank,
    monthly_salary: num(rank.salary),
    is_active: rank.is_active === null || rank.is_active === undefined ? true : Boolean(rank.is_active),
    requirements: requirements
      .filter((requirement) => requirement.rank_id === rank.id)
      .map((requirement) => ({
        metric: requirement.label ?? requirement.type,
        type: requirement.type,
        operator: requirement.operator ?? '',
        value: num(requirement.value),
        target_rank: targets.find((t) => t.id === requirement.target_rank_id)?.name ?? null,
      })),
  }))
}

export function updateRank(id: number, monthlySalary: number, isActive: boolean) {
  db.prepare(`UPDATE ranks SET salary = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(
    monthlySalary,
    isActive ? 1 : 0,
    id,
  )
}

export function rankReport(period: string) {
  const snapshots = db
    .prepare(
      `SELECT s.*, u.name AS member_name, u.member_code, r.name AS rank_name
       FROM member_rank_snapshots s JOIN users u ON u.id = s.member_id
       LEFT JOIN ranks r ON r.id = s.rank_id
       WHERE s.period = ? ORDER BY s.id DESC LIMIT 500`,
    )
    .all(period) as unknown as Array<Record<string, unknown>>

  const distribution = db
    .prepare(
      `SELECT r.level, r.name, COUNT(u.id) AS members_count FROM ranks r
       LEFT JOIN users u ON u.current_rank_id = r.id
       GROUP BY r.id ORDER BY r.level ASC`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const qualifiedMembers = countRows(
    `SELECT COUNT(DISTINCT member_id) AS c FROM member_rank_snapshots WHERE period = ?`,
    period,
  )

  return { period, qualifiedMembers, distribution, snapshots }
}

export function recalculateRankReport(period: string) {
  const members = db.prepare(`SELECT id FROM users WHERE status = 'active'`).all() as unknown as Array<{ id: number }>
  let written = 0

  for (const member of members) {
    const generations = downlineByGeneration(member.id)
    const ids: number[] = []
    for (const list of generations.values()) ids.push(...list)

    const personalVolume = round2(
      sumOf(
        `SELECT COALESCE(SUM(eligible_amount), 0) AS t FROM business_transactions
         WHERE member_id = ? AND status IN ('verified', 'approved')`,
        member.id,
      ),
    )
    const groupVolume = round2(
      ids.length
        ? sumOf(
            `SELECT COALESCE(SUM(eligible_amount), 0) AS t FROM business_transactions
             WHERE member_id IN (${ids.map(() => '?').join(',')}) AND status IN ('verified', 'approved')`,
            ...(ids as unknown[]),
          )
        : 0,
    )
    const directReferrals = countRows('SELECT COUNT(*) AS c FROM users WHERE sponsor_id = ?', member.id)
    const userRow = db.prepare('SELECT current_rank_id FROM users WHERE id = ?').get(member.id) as { current_rank_id: number | null } | undefined
    const rank = userRow?.current_rank_id
      ? (db.prepare('SELECT id, salary FROM ranks WHERE id = ?').get(userRow.current_rank_id) as { id: number; salary: number } | undefined)
      : undefined
    const salary = rank ? num(rank.salary) : 0

    db.prepare(
      `INSERT INTO member_rank_snapshots (member_id, rank_id, period, paid_rank_id, personal_volume, group_volume, direct_referrals, salary_eligible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(member_id, period) DO UPDATE SET
         rank_id = excluded.rank_id,
         paid_rank_id = excluded.paid_rank_id,
         personal_volume = excluded.personal_volume,
         group_volume = excluded.group_volume,
         direct_referrals = excluded.direct_referrals,
         salary_eligible = excluded.salary_eligible`,
    ).run(
      member.id,
      rank?.id ?? null,
      period,
      rank?.id ?? null,
      personalVolume,
      groupVolume,
      directReferrals,
      salary > 0 ? 1 : 0,
    )
    written += 1
  }

  return { period, written }
}

/* ------------------------------------------------------------------ */
/* Salary                                                              */
/* ------------------------------------------------------------------ */

export function salaryPage(input: { period?: string; status?: string }) {
  const where: string[] = []
  const params: unknown[] = []
  if (input.period) {
    where.push('p.period = ?')
    params.push(input.period)
  }
  if (input.status) {
    where.push('p.status = ?')
    params.push(input.status)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const rows = db
    .prepare(
      `SELECT p.id, p.member_id, p.period, p.amount, p.status, p.reason, p.created_at, p.processed_at,
              u.name AS member_name, u.member_code, r.name AS rank_name
       FROM salary_payouts p JOIN users u ON u.id = p.member_id
       LEFT JOIN ranks r ON r.id = p.rank_id
       ${whereSql} ORDER BY p.id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  const periods = db
    .prepare('SELECT period FROM salary_periods ORDER BY period DESC')
    .all() as unknown as Array<{ period: string }>

  return { items: rows, total: rows.length, periods: periods.map((p) => p.period), statuses: SALARY_STATUSES }
}

export function generateSalary(period: string) {
  db.prepare('INSERT OR IGNORE INTO salary_periods (period, status) VALUES (?, \'open\')').run(period)
  const periodRow = db.prepare('SELECT id FROM salary_periods WHERE period = ?').get(period) as { id: number } | undefined

  const members = db
    .prepare(
      `SELECT u.id, r.id AS rank_id, r.salary FROM users u JOIN ranks r ON r.id = u.current_rank_id
       WHERE u.status = 'active' AND r.salary > 0`,
    )
    .all() as unknown as Array<{ id: number; rank_id: number; salary: number }>

  let created = 0
  let total = 0

  for (const member of members) {
    const existing = db
      .prepare('SELECT id FROM salary_payouts WHERE member_id = ? AND period = ?')
      .get(member.id, period) as { id: number } | undefined
    if (existing) continue

    db.prepare(
      `INSERT INTO salary_payouts (member_id, rank_id, salary_period_id, period, amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
    ).run(member.id, member.rank_id, periodRow?.id ?? null, period, member.salary)
    created += 1
    total += member.salary
  }

  return { period, created, total: round2(total) }
}

export function salaryRow(id: number) {
  return db.prepare('SELECT * FROM salary_payouts WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined
}

export function approveSalary(id: number, adminId: number) {
  const payout = salaryRow(id)
  if (!payout) return null
  if (payout.status !== 'pending') return null
  db.prepare(`UPDATE salary_payouts SET status = 'approved', processed_by = ?, processed_at = datetime('now') WHERE id = ?`).run(
    adminId,
    id,
  )
  return { id, status: 'approved' }
}

export function rejectSalary(id: number, adminId: number, reason?: string | null) {
  const payout = salaryRow(id)
  if (!payout) return null
  if (payout.status !== 'pending') return null
  db.prepare(
    `UPDATE salary_payouts SET status = 'rejected', reason = ?, processed_by = ?, processed_at = datetime('now') WHERE id = ?`,
  ).run(reason ?? null, adminId, id)
  return { id, status: 'rejected' }
}

export function paySalary(id: number, adminId: number) {
  const payout = salaryRow(id)
  if (!payout) return null
  if (payout.status !== 'approved') return null

  postLedger({
    memberId: num(payout.member_id),
    type: 'salary',
    direction: 'credit',
    amount: num(payout.amount),
    referenceType: 'salary_payout',
    referenceId: id,
    description: `Monthly salary for ${payout.period}`,
  })

  db.prepare(`UPDATE salary_payouts SET status = 'paid', processed_by = ?, processed_at = datetime('now') WHERE id = ?`).run(
    adminId,
    id,
  )
  return { id, status: 'paid' }
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export function rewardsAdmin() {
  const rewards = db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM reward_claims rc WHERE rc.reward_id = r.id) AS claims_count
       FROM rewards r ORDER BY r.id DESC`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const claims = db
    .prepare(
      `SELECT c.id, c.member_id, c.reward_id, c.cost, c.status, c.note, c.claimed_at, c.created_at, c.approved_at,
              u.name AS member_name, u.member_code, rw.title AS reward_name
       FROM reward_claims c JOIN users u ON u.id = c.member_id JOIN rewards rw ON rw.id = c.reward_id
       ORDER BY c.id DESC LIMIT 500`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  const ranks = db.prepare('SELECT id, name FROM ranks ORDER BY level ASC').all() as unknown as Array<{
    id: number
    name: string
  }>

  return {
    rewards: rewards.map((reward) => ({
      ...reward,
      name: reward.title,
      threshold_amount: num(reward.threshold_amount ?? reward.cost),
      budget: reward.budget === null || reward.budget === undefined ? null : num(reward.budget),
      max_claims: reward.max_claims ?? null,
      is_active: Boolean(reward.active),
      image: reward.image_path ?? null,
      image_url: reward.image_path ?? null,
    })),
    claims,
    ranks,
  }
}

export function updateReward(
  id: number,
  data: {
    name?: string
    description?: string | null
    threshold_amount?: number | null
    budget?: number | null
    max_claims?: number | null
    required_rank_id?: number | null
    is_active?: boolean
  },
) {
  const current = db.prepare('SELECT * FROM rewards WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined
  if (!current) return null

  db.prepare(
    `UPDATE rewards SET title = ?, description = ?, cost = ?, threshold_amount = ?, budget = ?, max_claims = ?,
       required_rank_id = ?, active = ? WHERE id = ?`,
  ).run(
    data.name ?? String(current.title),
    data.description ?? (current.description as string | null) ?? null,
    data.threshold_amount ?? num(current.threshold_amount ?? current.cost),
    data.threshold_amount ?? num(current.threshold_amount ?? current.cost),
    data.budget ?? null,
    data.max_claims ?? null,
    data.required_rank_id ?? null,
    data.is_active === undefined ? current.active : data.is_active ? 1 : 0,
    id,
  )
  return { id }
}

export function rewardClaimsPage(status?: string) {
  const params: unknown[] = []
  let where = ''
  if (status) {
    where = 'WHERE c.status = ?'
    params.push(status)
  }
  const rows = db
    .prepare(
      `SELECT c.id, c.member_id, c.reward_id, c.cost, c.status, c.note, c.claimed_at, c.created_at, c.approved_at,
              u.name AS member_name, u.member_code, rw.title AS reward_name
       FROM reward_claims c JOIN users u ON u.id = c.member_id JOIN rewards rw ON rw.id = c.reward_id
       ${where} ORDER BY c.id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  return { items: rows, total: rows.length, statuses: ['pending', 'approved', 'rejected'] }
}

export function approveRewardClaim(id: number, adminId: number, note?: string | null) {
  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined
  if (!claim) return null
  if (claim.status !== 'pending') return null
  const stmt = db.prepare(
    `UPDATE reward_claims SET status = 'approved', note = COALESCE(?, note), reviewed_by = ?, reviewed_at = datetime('now'), approved_by = ?, approved_at = datetime('now')
     WHERE id = ?`,
  )
  ;(stmt as any).run(note ?? null, adminId, adminId, id)

export function rejectRewardClaim(id: number, adminId: number, note?: string | null) {
  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined
  if (!claim) return null
  if (claim.status !== 'pending') return null
  reverseLedger('reward_claim', id, `Reward claim #${id} rejected`)
  db.prepare(
    `UPDATE reward_claims SET status = 'rejected', note = COALESCE(?, note), reviewed_by = ?, reviewed_at = datetime('now'), approved_by = ?, approved_at = datetime('now')
     WHERE id = ?`,
  ).run(note ?? null, adminId, adminId, id)
  return { id, status: 'rejected' }
}

/* ------------------------------------------------------------------ */
/* Announcements, audit logs, jobs, settings                           */
/* ------------------------------------------------------------------ */

export function announcementsList() {
  const rows = db
    .prepare(
      `SELECT a.*, u.name AS created_by_name FROM announcements a LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.id DESC LIMIT 300`,
    )
    .all() as unknown as Array<Record<string, unknown>>

  return { items: rows, total: rows.length }
}

export function createAnnouncement(
  input: { title: string; body: string; audience: string; severity: string; expiresAt?: string | null },
  adminId: number,
) {
  const info = db
    .prepare(
      `INSERT INTO announcements (title, body, audience, severity, expires_at, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(input.title, input.body, input.audience, input.severity, input.expiresAt || null, adminId)
  return Number(info.lastInsertRowid)
}

export function publishAnnouncement(id: number) {
  db.prepare(`UPDATE announcements SET is_published = 1, published_at = datetime('now') WHERE id = ?`).run(id)
}

export function auditLogsPage(input: { q?: string; action?: string; page?: number; perPage?: number }) {
  const { page, perPage } = pageParams(input.page, input.perPage)
  const where: string[] = []
  const params: unknown[] = []
  const search = (input.q ?? '').trim()

  if (search) {
    where.push('(lower(l.action) LIKE ? OR lower(l.auditable_type) LIKE ? OR lower(l.subject_type) LIKE ?)')
    const like = `%${search.toLowerCase()}%`
    params.push(like, like, like)
  }
  if (input.action) {
    where.push('lower(l.action) LIKE ?')
    params.push(`${input.action.toLowerCase()}%`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = countRows(`SELECT COUNT(*) AS c FROM audit_logs l ${whereSql}`, ...params)

  const rows = db
    .prepare(
      `SELECT l.id, l.action, l.auditable_type, l.auditable_id, l.subject_type, l.subject_id, l.payload,
              l.new_values, l.old_values, l.ip_address, l.created_at, u.name AS user_name
       FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id
       ${whereSql} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...(params as never[]), perPage, (page - 1) * perPage) as unknown as Array<Record<string, unknown>>

  return {
    ...paginate(
      rows.map((row) => ({
        ...row,
        auditable_type: row.auditable_type ?? row.subject_type ?? null,
        auditable_id: row.auditable_id ?? row.subject_id ?? null,
        new_values: parseJson(row.new_values ?? row.payload),
        old_values: parseJson(row.old_values),
      })),
      total,
      page,
      perPage,
    ),
  }
}

export function jobRunsPage(input: { job?: string; status?: string }) {
  const where: string[] = []
  const params: unknown[] = []
  if (input.job) {
    where.push('job_name = ?')
    params.push(input.job)
  }
  if (input.status) {
    where.push('status = ?')
    params.push(input.status)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const rows = db
    .prepare(
      `SELECT id, job_name, status, processed_count, started_at, finished_at, host, error_message, created_at
       FROM scheduled_job_runs ${whereSql} ORDER BY id DESC LIMIT 500`,
    )
    .all(...(params as never[])) as unknown as Array<Record<string, unknown>>

  const names = db
    .prepare('SELECT DISTINCT job_name FROM scheduled_job_runs ORDER BY job_name')
    .all() as unknown as Array<{ job_name: string }>

  return { items: rows, total: rows.length, jobNames: names.map((n) => n.job_name), statuses: JOB_STATUSES }
}

export function settingBool(key: string, fallback = false): boolean {
  const row = db.prepare('SELECT value FROM application_settings WHERE key = ?').get(key) as { value: string } | undefined
  if (!row || row.value === null || row.value === undefined) return fallback
  return row.value === '1' || row.value.toLowerCase() === 'true'
}

export function settingsOverview() {
  const toggles = SETTING_TOGGLES.map((toggle) => ({
    key: toggle.key,
    label: toggle.label,
    description: toggle.description,
    env: toggle.env,
    enabled: settingBool(toggle.key, toggle.default),
  }))

  const stored = db
    .prepare(`SELECT key, value FROM application_settings WHERE type = 'boolean'`)
    .all() as unknown as Array<{ key: string; value: string }>

  for (const row of stored) {
    if (toggles.some((toggle) => toggle.key === row.key)) continue
    const description = (
      db.prepare('SELECT description FROM application_settings WHERE key = ?').get(row.key) as
        | { description: string | null }
        | undefined
    )?.description
    toggles.push({
      key: row.key,
      label: description || row.key,
      description: description ?? '',
      env: null,
      enabled: settingBool(row.key, false),
    })
  }

  return {
    toggles,
    rawConfig: {
      deposits_enabled: settingBool('deposits.enabled', true),
      commission_base: 'eligible_verified_amount',
      currency: config.currency,
      timezone: 'Asia/Dhaka',
      profit_share_enabled: settingBool('profit_share.enabled', false),
    },
  }
}

export function updateSetting(key: string, value: string) {
  const isBoolean =
    SETTING_TOGGLES.some((toggle) => toggle.key === key) || key.endsWith('.enabled') || key.endsWith('_enabled')
  const stored = isBoolean ? (value === '1' || String(value).toLowerCase() === 'true' ? '1' : '0') : value

  db.prepare(
    `INSERT INTO application_settings (key, value, group_name, type, updated_at)
     VALUES (?, ?, 'runtime', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type, updated_at = datetime('now')`,
  ).run(key, stored, isBoolean ? 'boolean' : 'string')

  return { key, value: stored }
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function reportMetrics(from: string, to: string) {
  const metrics: Record<string, number | Record<string, number>> = {
    total_registered_members: countRows('SELECT COUNT(*) AS c FROM users'),
    active_members: countRows(`SELECT COUNT(*) AS c FROM users WHERE status = 'active'`),
    inactive_members: countRows(`SELECT COUNT(*) AS c FROM users WHERE status = 'inactive'`),
    direct_referrals_total: countRows('SELECT COUNT(*) AS c FROM users WHERE sponsor_id IS NOT NULL'),
    gross_business_volume: round2(
      sumOf('SELECT COALESCE(SUM(gross_amount), 0) AS t FROM business_transactions WHERE created_at BETWEEN ? AND ?', from, to),
    ),
    eligible_commissionable_volume: round2(
      sumOf(
        `SELECT COALESCE(SUM(eligible_amount), 0) AS t FROM business_transactions
         WHERE status IN ('verified', 'approved') AND created_at BETWEEN ? AND ?`,
        from,
        to,
      ),
    ),
    platform_wallet_balance: round2(sumOf('SELECT COALESCE(SUM(balance), 0) AS t FROM wallet_accounts')),
    commission_liability_pending: round2(
      sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM commissions WHERE status = 'pending'`),
    ),
    commission_approved_unpaid: round2(
      sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM commissions WHERE status = 'approved'`),
    ),
    commission_paid: round2(sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM commissions WHERE status = 'paid'`)),
    salary_pending: round2(sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM salary_payouts WHERE status = 'pending'`)),
    salary_paid: round2(sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM salary_payouts WHERE status = 'paid'`)),
    withdrawals_pending: countRows(`SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = 'pending'`),
    withdrawals_approved: countRows(`SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = 'approved'`),
    withdrawals_paid: round2(
      sumOf(`SELECT COALESCE(SUM(amount), 0) AS t FROM withdrawal_requests WHERE status = 'paid'`),
    ),
  }

  const distribution = db
    .prepare(
      `SELECT r.name, COUNT(u.id) AS members_count FROM ranks r
       LEFT JOIN users u ON u.current_rank_id = r.id GROUP BY r.id ORDER BY r.level ASC`,
    )
    .all() as unknown as Array<{ name: string; members_count: number }>

  const rankDistribution: Record<string, number> = {}
  for (const row of distribution) rankDistribution[row.name] = num(row.members_count)

  metrics.rank_distribution = rankDistribution
  return metrics
}

export const REPORT_METRIC_LABELS: Record<string, string> = {
  total_registered_members: 'Total registered members',
  active_members: 'Active members',
  inactive_members: 'Inactive members',
  direct_referrals_total: 'Direct referrals (edges)',
  gross_business_volume: 'Gross business volume',
  eligible_commissionable_volume: 'Eligible commissionable volume',
  platform_wallet_balance: 'Platform wallet balance',
  commission_liability_pending: 'Commission liability (pending)',
  commission_approved_unpaid: 'Commission approved unpaid',
  commission_paid: 'Commission paid',
  salary_pending: 'Salary pending',
  salary_paid: 'Salary paid',
  withdrawals_pending: 'Withdrawals pending (count)',
  withdrawals_approved: 'Withdrawals approved (count)',
  withdrawals_paid: 'Withdrawals paid (amount)',
}

export function reportExportRows(metrics: Record<string, number | Record<string, number>>): Array<[string, string]> {
  const rows: Array<[string, string]> = [['Metric', 'Value']]

  for (const [key, value] of Object.entries(metrics)) {
    if (key === 'rank_distribution') {
      for (const [rankName, count] of Object.entries(value as Record<string, number>)) {
        rows.push([`Members at rank: ${rankName}`, String(count)])
      }
      continue
    }
    rows.push([
      REPORT_METRIC_LABELS[key] ?? key,
      typeof value === 'number' ? value.toFixed(2) : String(value),
    ])
  }

  return rows
}

/* ------------------------------------------------------------------ */
/* Network explorer                                                    */
/* ------------------------------------------------------------------ */

export function networkExplorer(memberCode: string, depth: number) {
  const root = db
    .prepare(
      `SELECT u.id, u.name, u.member_code, u.status, u.registered_at, r.name AS rank_name
       FROM users u LEFT JOIN ranks r ON r.id = u.current_rank_id
       WHERE u.member_code = ?`,
    )
    .get(memberCode.trim().toUpperCase()) as unknown as Record<string, unknown> | undefined

  if (!root) return null

  const generations = downlineByGeneration(num(root.id), Math.min(Math.max(depth, 1), 10))
  const generationCounts: Record<string, number> = {}
  const members: Array<Record<string, unknown>> = []

  for (const [generation, ids] of generations.entries()) {
    generationCounts[String(generation)] = ids.length
    if (ids.length === 0) continue
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.member_code, u.status, u.registered_at, r.name AS rank_name
         FROM users u LEFT JOIN ranks r ON r.id = u.current_rank_id
         WHERE u.id IN (${ids.map(() => '?').join(',')}) ORDER BY u.id ASC`,
      )
      .all(...(ids as never[])) as unknown as Array<Record<string, unknown>>
    for (const row of rows) members.push({ ...row, generation })
  }

  members.unshift({ ...root, generation: 0 })

  return {
    root: { ...root, current_rank: root.rank_name ?? null },
    generationCounts,
    totalDownline: Object.values(generationCounts).reduce((total, count) => total + count, 0),
    members,
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function toScalar(value: unknown): number | string | null {
  return scalar(value)
}

export function memberReferrals(memberId: number) {
  return directReferrals(memberId)
}

export function createPendingCommissions(
  sourceMemberId: number,
  transactionId: number,
  amount: number,
  options: { status?: string; credit?: boolean; rates?: GenerationRate[]; planId?: number | null } = {},
) {
  return generateCommissions(sourceMemberId, transactionId, amount, options)
}
