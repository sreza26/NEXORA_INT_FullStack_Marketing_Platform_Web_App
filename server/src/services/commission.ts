import { db } from '../db/index.js'
import { config, type GenerationRate } from '../config/index.js'
import { postLedger } from '../models/ledger.js'

export interface CommissionResult {
  created: number
  skipped: number
  total: number
}

export interface CommissionOptions {
  /** Commission status written on creation. Defaults to the legacy 'approved'. */
  status?: string
  /** Credit the member wallet right away. Defaults to true. */
  credit?: boolean
  /** Overrides the configured generation rates. */
  rates?: GenerationRate[]
  /** Compensation plan the commissions were calculated from. */
  planId?: number | null
  /** Base amount used for the calculation, stored for auditing. */
  baseAmount?: number
}

/** Percentage rate for a generation, taken from the banded compensation plan. */
export function rateForGeneration(generation: number): number {
  const band = config.commission.generationRates.find(
    (entry) => generation >= entry.generation_from && generation <= entry.generation_to,
  )
  return band ? band.rate : 0
}

/** Highest generation the compensation plan pays out on. */
export function maxPayoutGeneration(): number {
  return config.commission.generationRates.reduce(
    (max, entry) => Math.max(max, entry.generation_to),
    0,
  )
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
  options: CommissionOptions = {},
): CommissionResult {
  if (!config.commission.enabled) return { created: 0, skipped: 0, total: 0 }

  const rates = options.rates ?? config.commission.generationRates
  const status = options.status ?? 'approved'
  const credit = options.credit ?? true

  const sponsor = db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(sourceMemberId) as
    | { sponsor_id: number | null }
    | undefined

  let currentSponsorId = sponsor?.sponsor_id ?? null
  let generation = 1
  let created = 0
  let skipped = 0
  let total = 0
  const limit = Math.max(
    config.commission.generation,
    rates.reduce((max, entry) => Math.max(max, entry.generation_to), 0),
  )

  while (currentSponsorId && generation <= limit) {
    const band = rates.find((entry) => generation >= entry.generation_from && generation <= entry.generation_to)
    const rate = band ? band.rate / 100 : 0
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
            `INSERT INTO commissions (recipient_id, source_member_id, source_transaction_id, generation, amount, rate, status, plan_id, base_amount, idempotency_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            currentSponsorId,
            sourceMemberId,
            sourceTransactionId,
            generation,
            commissionAmount,
            band ? band.rate : 0,
            status,
            options.planId ?? null,
            options.baseAmount ?? amount,
            `${sourceTransactionId}:${currentSponsorId}:${generation}`,
          )

        if (credit) {
          postLedger({
            memberId: currentSponsorId,
            type: 'commission',
            direction: 'credit',
            amount: commissionAmount,
            referenceType: 'commission',
            referenceId: Number(info.lastInsertRowid),
            description: `Generation ${generation} commission`,
          })
        }
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
