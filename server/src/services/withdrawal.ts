import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { postLedger, reverseLedger, walletBalance } from '../models/ledger.js'
import { decryptSecret, encryptSecret } from '../utils/crypto.js'
import { BusinessRuleError } from '../utils/errors.js'

/**
 * Withdrawal rows carry an encrypted account detail. The value is decrypted
 * for display only; it is never stored in the clear.
 */
function withDecryptedAccount<T extends { account_details?: string | null }>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    account_details: decryptSecret(row.account_details ?? null),
  }))
}

export async function listWithdrawals(memberId: number, limit = 100, offset = 0): Promise<any[]> {
  const rows = (await db
    .prepare(
      `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
              w.status, w.notes, w.requested_at, w.processed_at
       FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
       WHERE w.member_id = ? ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    )
    .all(memberId, limit, offset)) as any[]
  return withDecryptedAccount(rows)
}

export async function listAllWithdrawals(status?: string, limit = 100, offset = 0): Promise<any[]> {
  if (status) {
    const rows = (await db
      .prepare(
        `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
                w.status, w.notes, w.requested_at, w.processed_at
         FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
         WHERE w.status = ? ORDER BY w.id DESC LIMIT ? OFFSET ?`,
      )
      .all(status, limit, offset)) as any[]
    return withDecryptedAccount(rows)
  }
  const rows = (await db
    .prepare(
      `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
              w.status, w.notes, w.requested_at, w.processed_at
       FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
       ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset)) as any[]
  return withDecryptedAccount(rows)
}

export async function findWithdrawal(id: number) {
  const row = await db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as any | undefined
  if (!row) return undefined
  return { ...row, account_details: decryptSecret(row.account_details ?? null) }
}

export async function createWithdrawal(input: {
  memberId: number
  amount: number
  method: string
  accountDetails?: string
}): Promise<{ id: number; balance: number }> {
  const balance = await walletBalance(input.memberId)
  if (input.amount < config.withdrawal.minAmount) {
    throw new BusinessRuleError(`Minimum withdrawal amount is ${config.withdrawal.minAmount}`)
  }
  if (input.amount > config.withdrawal.maxAmount) {
    throw new BusinessRuleError(`Maximum withdrawal amount is ${config.withdrawal.maxAmount}`)
  }
  if (input.amount > balance) {
    throw new BusinessRuleError('Insufficient wallet balance')
  }

  const reference = `WDR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`

  const info = await db
    .prepare(
      `INSERT INTO withdrawal_requests
         (member_id, reference, amount, currency, method, account_details, status, requested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'), datetime('now'))`,
    )
    .run(
      input.memberId,
      reference,
      input.amount,
      config.currency,
      input.method,
      input.accountDetails ? encryptSecret(input.accountDetails) : null,
    )

  const id = Number(info.lastInsertRowid)
  const newBalance = await postLedger({
      memberId: input.memberId,
      type: 'withdrawal',
      direction: 'debit',
      amount: input.amount,
      referenceType: 'withdrawal_request',
      referenceId: id,
      description: `Withdrawal request #${id}`,
      status: 'pending',
    })

  return { id, balance: newBalance }
}

export async function approveWithdrawal(id: number, adminId: number, notes?: string): Promise<void> {
  const request = await findWithdrawal(id)
  if (!request) throw new BusinessRuleError('Withdrawal request not found')
  if (request.status !== 'pending') throw new BusinessRuleError('Withdrawal request is not pending')

  await db.prepare(
    `UPDATE withdrawal_requests SET status = 'approved', processed_at = datetime('now'), processed_by = ?, notes = ? WHERE id = ?`,
  ).run(adminId, notes ?? null, id)

  await db.prepare(`UPDATE ledger_entries SET status = 'approved' WHERE reference_type = 'withdrawal_request' AND reference_id = ?`).run(id)
}

export async function rejectWithdrawal(id: number, adminId: number, notes?: string): Promise<void> {
  const request = await findWithdrawal(id)
  if (!request) throw new BusinessRuleError('Withdrawal request not found')
  if (request.status !== 'pending') throw new BusinessRuleError('Withdrawal request is not pending')

  await reverseLedger('withdrawal_request', id, `Withdrawal request #${id} rejected`)

  await db.prepare(
    `UPDATE withdrawal_requests SET status = 'rejected', processed_at = datetime('now'), processed_by = ?, notes = ? WHERE id = ?`,
  ).run(adminId, notes ?? null, id)
}

export async function countByStatus(status: string): Promise<number> {
  return (await db.prepare('SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = ?').get(status) as { c: number }).c
}

export async function approvedTotal(): Promise<number> {
  const row = (await db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE status = 'approved'`)
    .get()) as { total: number }
  return Number(row.total ?? 0)
}
