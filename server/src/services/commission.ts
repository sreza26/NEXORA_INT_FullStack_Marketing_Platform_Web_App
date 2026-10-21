import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { postLedger } from '../models/ledger.js'

export interface CommissionResult {
  created: number
  skipped: number
  total: number
}

/**
 * Walk up the sponsor chain and create a commission for every generation
 * inside the configured limit. Idempotent: the unique index on
 * (recipient_id, source_transaction_id, generation) blocks duplicates.
 */
export function generateCommissions(
  sourceMemberId: number,
  sourceTransactionId: number,
  amount: number,
): CommissionResult {
  if (!config.commission.enabled) return { created: 0, skipped: 0, total: 0 }

  const sponsor = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(sourceMemberId) as
    | { sponsor_id: number | null }
    | undefined

  let currentSponsorId = sponsor?.sponsor_id ?? null
  let generation = 1
  let created = 0
  let skipped = 0
  let total = 0

  while (currentSponsorId && generation <= config.commission.generation) {
    const rate = config.commission.rates[generation - 1] ?? 0
    const commissionAmount = Math.round(amount * rate * 100) / 100

    if (commissionAmount > 0) {
      const existing = db
        .prepare(
          'SELECT id FROM commissions WHERE recipient_id = ? AND source_transaction_id = ? AND generation = ?',
        )
        .get(currentSponsorId, sourceTransactionId, generation)

      if (existing) {
        skipped += 1
      } else {
        const info = db
          .prepare(
            `INSERT INTO commissions (recipient_id, source_member_id, source_transaction_id, generation, amount, rate, status)
             VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
          )
          .run(currentSponsorId, sourceMemberId, sourceTransactionId, generation, commissionAmount, rate)

        postLedger({
          memberId: currentSponsorId,
          type: 'commission',
          direction: 'credit',
          amount: commissionAmount,
          referenceType: 'commission',
          referenceId: Number(info.lastInsertRowid),
          description: `Generation ${generation} commission`,
        })
        created += 1
        total += commissionAmount
      }
    }

    const next = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(currentSponsorId) as
      | { sponsor_id: number | null }
      | undefined
    currentSponsorId = next?.sponsor_id ?? null
    generation += 1
  }

  return { created, skipped, total }
}

export function listCommissions(memberId: number, limit = 100, offset = 0) {
  return db
    .prepare(
      `SELECT c.id, c.recipient_id, c.source_member_id, c.generation, c.amount, c.rate, c.status, c.created_at,
              u.name AS source_name
       FROM commissions c LEFT JOIN users u ON u.id = c.source_member_id
       WHERE c.recipient_id = ? ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    )
    .all(memberId, limit, offset) as any[]
}

export function totalCommissionFor(memberId: number): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM commissions WHERE recipient_id = ? AND status = 'approved'`)
    .get(memberId) as { total: number }
  return Number(row.total ?? 0)
}

export function totalPaidCommission(): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM commissions WHERE status = 'approved'`)
    .get() as { total: number }
  return Number(row.total ?? 0)
}
