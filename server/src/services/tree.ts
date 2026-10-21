import { db } from '../db/index.js'

export interface ReferralRow {
  id: number
  name: string
  member_code: string
  status: string
  verification_status: string
  joined_at: string
}

export function directReferrals(memberId: number): ReferralRow[] {
  return db
    .prepare(
      `SELECT id, name, member_code, status, verification_status, created_at AS joined_at
       FROM users WHERE sponsor_id = ? ORDER BY id DESC`,
    )
    .all(memberId) as unknown as ReferralRow[]
}

/** Breadth-first collection of every descendant id keyed by generation depth. */
export function downlineByGeneration(memberId: number, maxDepth = 10): Map<number, number[]> {
  const result = new Map<number, number[]>()
  let frontier = [memberId]

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (frontier.length === 0) break
    const placeholders = frontier.map(() => '?').join(',')
    const children = db
      .prepare(`SELECT id FROM users WHERE sponsor_id IN (${placeholders})`)
      .all(...frontier) as { id: number }[]
    const ids = children.map((c) => c.id)
    if (ids.length === 0) break
    result.set(depth, ids)
    frontier = ids
  }

  return result
}

export function totalNetworkSize(memberId: number): number {
  let total = 0
  for (const ids of downlineByGeneration(memberId).values()) {
    total += ids.length
  }
  return total
}

export function teamVolume(memberId: number): number {
  const generations = downlineByGeneration(memberId)
  const ids: number[] = []
  for (const list of generations.values()) ids.push(...list)
  if (ids.length === 0) return 0

  const placeholders = ids.map(() => '?').join(',')
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM business_transactions
       WHERE member_id IN (${placeholders}) AND status = 'approved'`,
    )
    .get(...ids) as { total: number }

  return Number(row.total ?? 0)
}

export function downlineCounts(memberId: number): { level: number; count: number }[] {
  const generations = downlineByGeneration(memberId)
  const out: { level: number; count: number }[] = []
  for (const [level, ids] of generations.entries()) {
    out.push({ level, count: ids.length })
  }
  return out
}
