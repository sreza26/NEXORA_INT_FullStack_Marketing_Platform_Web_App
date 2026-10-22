import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { postLedger } from '../models/ledger.js'
import { downlineByGeneration } from './tree.js'

export function listRanks() {
  return db.prepare('SELECT * FROM ranks ORDER BY level ASC').all() as any[]
}

export function listRanksWithRequirements() {
  const ranks = listRanks()
  const requirementRows = db
    .prepare('SELECT * FROM rank_requirements ORDER BY rank_id ASC, sort_order ASC')
    .all() as any[]

  return ranks.map((rank) => ({
    id: rank.id,
    code: rank.code,
    name: rank.name,
    level: rank.level,
    monthly_salary: rank.salary,
    requirements: requirementRows
      .filter((requirement) => requirement.rank_id === rank.id)
      .map((requirement) => ({
        type: requirement.type,
        value: requirement.value,
        label: requirement.label ?? requirement.type,
        target_rank_code: requirement.target_rank_code,
        sort_order: requirement.sort_order,
      })),
  }))
}

export function findRank(id: number) {
  return db.prepare('SELECT * FROM ranks WHERE id = ?').get(id) as any | undefined
}

export function rankOf(memberId: number) {
  const row = db
    .prepare(
      `SELECT r.* FROM ranks r JOIN users u ON u.current_rank_id = r.id WHERE u.id = ?`,
    )
    .get(memberId) as any | undefined
  return row ?? null
}

export function achievements(memberId: number) {
  return db
    .prepare(
      `SELECT a.id, a.achieved_at, r.name, r.code, r.level FROM rank_achievements a
       JOIN ranks r ON r.id = a.rank_id WHERE a.member_id = ? ORDER BY a.id DESC`,
    )
    .all(memberId) as any[]
}

/**
 * Recalculate the rank for a member based on direct referrals and downline
 * volume, then record the achievement when a new rank is reached.
 */
export function evaluateRank(memberId: number) {
  const ranks = listRanks()
  if (ranks.length === 0) return null

  const direct = (
    db.prepare('SELECT COUNT(*) AS c FROM users WHERE sponsor_id = ?').get(memberId) as { c: number }
  ).c

  const generations = downlineByGeneration(memberId)
  const ids: number[] = []
  for (const list of generations.values()) ids.push(...list)
  let volume = 0
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',')
    volume = Number(
      (
        db
          .prepare(
            `SELECT COALESCE(SUM(amount), 0) AS total FROM business_transactions
             WHERE member_id IN (${placeholders}) AND status = 'approved'`,
          )
          .get(...ids) as { total: number }
      ).total ?? 0,
    )
  }

  const eligible = [...ranks]
    .reverse()
    .find((r) => direct >= (r.min_direct_links ?? 0) && volume >= (r.downline_volume ?? 0))

  if (!eligible) return null

  const current = rankOf(memberId)
  if (current?.id !== eligible.id) {
    db.prepare(`UPDATE users SET current_rank_id = ?, updated_at = datetime('now') WHERE id = ?`).run(eligible.id, memberId)
    db.prepare('INSERT INTO rank_achievements (member_id, rank_id) VALUES (?, ?)').run(memberId, eligible.id)
  }

  return { ...eligible, direct_links: direct, downline_volume: volume }
}

/** Pay the monthly salary for every member whose rank carries one. */
export function runMonthlySalary(reference: string) {
  if (!config.salary.enabled) return { paid: 0, total: 0 }

  const members = db
    .prepare(
      `SELECT u.id, r.salary FROM users u JOIN ranks r ON r.id = u.current_rank_id
       WHERE u.status = 'active' AND r.salary > 0`,
    )
    .all() as { id: number; salary: number }[]

  let total = 0
  for (const member of members) {
    const exists = db
      .prepare(`SELECT id FROM business_transactions WHERE reference = ?`)
      .get(`${reference}:${member.id}`)

    if (exists) continue

    db.prepare(`INSERT INTO business_transactions (member_id, reference, amount, type, status) VALUES (?, ?, ?, 'salary', 'approved')`)
      .run(member.id, `${reference}:${member.id}`, member.salary)

    postLedger({
      memberId: member.id,
      type: 'salary',
      direction: 'credit',
      amount: member.salary,
      referenceType: 'salary',
      referenceId: member.id,
      description: `Monthly salary for ${reference}`,
    })
    total += member.salary
  }

  return { paid: members.length, total }
}
