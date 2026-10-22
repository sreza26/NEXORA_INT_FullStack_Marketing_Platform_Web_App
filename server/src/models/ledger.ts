import { db } from '../db/index.js'

export function walletBalance(memberId: number): number {
  const row = db.prepare('SELECT balance FROM wallet_accounts WHERE member_id = ?').get(memberId) as
    | { balance: number }
    | undefined
  return row?.balance ?? 0
}

export function syncWalletTotals(memberId: number): void {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN direction = 'credit' AND status <> 'reversed' THEN amount ELSE 0 END), 0) AS credited,
         COALESCE(SUM(CASE WHEN direction = 'debit' AND status <> 'reversed' THEN amount ELSE 0 END), 0) AS debited,
         COALESCE(SUM(CASE WHEN direction = 'credit' AND status = 'pending' THEN amount
                           WHEN direction = 'debit' AND status = 'pending' THEN -amount ELSE 0 END), 0) AS pending
       FROM ledger_entries WHERE member_id = ?`,
    )
    .get(memberId) as { credited: number; debited: number; pending: number } | undefined

  db.prepare(
    `UPDATE wallet_accounts SET
       pending_balance = ?,
       lifetime_credited = ?,
       lifetime_debited = ?,
       updated_at = datetime('now')
     WHERE member_id = ?`,
  ).run(row?.pending ?? 0, row?.credited ?? 0, row?.debited ?? 0, memberId)
}

export function listLedger(memberId: number, limit = 100, offset = 0) {
  return db
    .prepare(
      `SELECT id, type, direction, amount, balance_after, reference_type, reference_id, description, status, created_at
       FROM ledger_entries WHERE member_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(memberId, limit, offset) as any[]
}

/**
 * Append-only ledger write. The balance is recalculated inside the same
 * statement batch so the ledger can never drift from the wallet.
 */
export function postLedger(entry: {
  memberId: number
  type: string
  direction: 'credit' | 'debit'
  amount: number
  referenceType?: string | null
  referenceId?: number | null
  description?: string | null
  status?: string
}): number {
  const current = walletBalance(entry.memberId)
  const delta = entry.direction === 'credit' ? entry.amount : -entry.amount
  const next = Math.round((current + delta) * 100) / 100

  db.prepare(
    `INSERT INTO ledger_entries (member_id, type, direction, amount, balance_after, reference_type, reference_id, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.memberId,
    entry.type,
    entry.direction,
    entry.amount,
    next,
    entry.referenceType ?? null,
    entry.referenceId ?? null,
    entry.description ?? null,
    entry.status ?? 'approved',
  )

  db.prepare('UPDATE wallet_accounts SET balance = ?, updated_at = datetime(\'now\') WHERE member_id = ?').run(next, entry.memberId)
  syncWalletTotals(entry.memberId)

  return next
}

export function reverseLedger(referenceType: string, referenceId: number, description: string): void {
  const entries = db
    .prepare(
      `SELECT * FROM ledger_entries WHERE reference_type = ? AND reference_id = ? AND status = 'approved'`,
    )
    .all(referenceType, referenceId) as any[]

  for (const entry of entries) {
    db.prepare(`UPDATE ledger_entries SET status = 'reversed' WHERE id = ?`).run(entry.id)
    const current = walletBalance(entry.member_id)
    const delta = entry.direction === 'credit' ? -entry.amount : entry.amount
    const next = Math.round((current + delta) * 100) / 100

    db.prepare(
      `INSERT INTO ledger_entries (member_id, type, direction, amount, balance_after, reference_type, reference_id, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
    ).run(
      entry.member_id,
      'reversal',
      entry.direction === 'credit' ? 'debit' : 'credit',
      entry.amount,
      next,
      referenceType,
      referenceId,
      description,
    )
    db.prepare('UPDATE wallet_accounts SET balance = ?, updated_at = datetime(\'now\') WHERE member_id = ?').run(next, entry.member_id)
    syncWalletTotals(entry.member_id)
  }
}
