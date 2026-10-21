import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { postLedger, reverseLedger, walletBalance } from '../models/ledger.js'

export function listWithdrawals(memberId: number, limit = 100, offset = 0) {
  return db
    .prepare(
      `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
              w.status, w.notes, w.requested_at, w.processed_at
       FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
       WHERE w.member_id = ? ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    )
    .all(memberId, limit, offset) as any[]
}

export function listAllWithdrawals(status?: string, limit = 100, offset = 0) {
  if (status) {
    return db
      .prepare(
        `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
                w.status, w.notes, w.requested_at, w.processed_at
         FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
         WHERE w.status = ? ORDER BY w.id DESC LIMIT ? OFFSET ?`,
      )
      .all(status, limit, offset) as any[]
  }
  return db
    .prepare(
      `SELECT w.id, w.member_id, u.name AS member_name, u.member_code, w.amount, w.method, w.account_details,
              w.status, w.notes, w.requested_at, w.processed_at
       FROM withdrawal_requests w JOIN users u ON u.id = w.member_id
       ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as any[]
}

export function findWithdrawal(id: number) {
  return db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as any | undefined
}

export function createWithdrawal(input: {
  memberId: number
  amount: number
  method: string
  accountDetails?: string
}): { id: number; balance: number } {
  const balance = walletBalance(input.memberId)
  if (input.amount < config.withdrawal.minAmount) {
    throw new Error(`Minimum withdrawal amount is ${config.withdrawal.minAmount}`)
  }
  if (input.amount > config.withdrawal.maxAmount) {
    throw new Error(`Maximum withdrawal amount is ${config.withdrawal.maxAmount}`)
  }
  if (input.amount > balance) {
    throw new Error('Insufficient wallet balance')
  }

  const info = db
    .prepare(
      `INSERT INTO withdrawal_requests (member_id, amount, method, account_details, status)
       VALUES (?, ?, ?, ?, 'pending')`,
    )
    .run(input.memberId, input.amount, input.method, input.accountDetails ?? null)

  const id = Number(info.lastInsertRowid)
  const newBalance = postLedger({
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

export function approveWithdrawal(id: number, adminId: number, notes?: string): void {
  const request = findWithdrawal(id)
  if (!request) throw new Error('Withdrawal request not found')
  if (request.status !== 'pending') throw new Error('Withdrawal request is not pending')

  db.prepare(
    `UPDATE withdrawal_requests SET status = 'approved', processed_at = datetime('now'), processed_by = ?, notes = ? WHERE id = ?`,
  ).run(adminId, notes ?? null, id)

  db.prepare(`UPDATE ledger_entries SET status = 'approved' WHERE reference_type = 'withdrawal_request' AND reference_id = ?`).run(id)
}

export function rejectWithdrawal(id: number, adminId: number, notes?: string): void {
  const request = findWithdrawal(id)
  if (!request) throw new Error('Withdrawal request not found')
  if (request.status !== 'pending') throw new Error('Withdrawal request is not pending')

  reverseLedger('withdrawal_request', id, `Withdrawal request #${id} rejected`)

  db.prepare(
    `UPDATE withdrawal_requests SET status = 'rejected', processed_at = datetime('now'), processed_by = ?, notes = ? WHERE id = ?`,
  ).run(adminId, notes ?? null, id)
}

export function countByStatus(status: string): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = ?').get(status) as { c: number }).c
}

export function approvedTotal(): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE status = 'approved'`)
    .get() as { total: number }
  return Number(row.total ?? 0)
}
