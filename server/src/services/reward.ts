import { db } from '../db/index.js'
import { postLedger, reverseLedger, walletBalance } from '../models/ledger.js'

export function listRewards(onlyActive = true) {
  const sql = onlyActive
    ? 'SELECT * FROM rewards WHERE active = 1 ORDER BY id DESC'
    : 'SELECT * FROM rewards ORDER BY id DESC'
  return db.prepare(sql).all() as any[]
}

export function findReward(id: number) {
  return db.prepare('SELECT * FROM rewards WHERE id = ?').get(id) as any | undefined
}

export function createReward(input: {
  title: string
  description?: string
  imagePath?: string | null
  cost: number
}): number {
  const info = db
    .prepare('INSERT INTO rewards (title, description, image_path, cost, active) VALUES (?, ?, ?, ?, 1)')
    .run(input.title, input.description ?? null, input.imagePath ?? null, input.cost)
  return Number(info.lastInsertRowid)
}

export function claimReward(memberId: number, rewardId: number) {
  const reward = findReward(rewardId)
  if (!reward) throw new Error('Reward not found')
  if (!reward.active) throw new Error('Reward is not available')

  const balance = walletBalance(memberId)
  if (balance < reward.cost) throw new Error('Insufficient wallet balance to claim this reward')

  const info = db
    .prepare('INSERT INTO reward_claims (member_id, reward_id, cost, status) VALUES (?, ?, ?, ?)')
    .run(memberId, rewardId, reward.cost, reward.cost > 0 ? 'pending' : 'approved')
  const claimId = Number(info.lastInsertRowid)

  if (reward.cost > 0) {
    postLedger({
      memberId,
      type: 'reward',
      direction: 'debit',
      amount: reward.cost,
      referenceType: 'reward_claim',
      referenceId: claimId,
      description: `Reward claim: ${reward.title}`,
      status: 'pending',
    })
  }

  return claimId
}

export function listClaims(memberId?: number) {
  if (memberId) {
    return db
      .prepare(
        `SELECT c.id, c.member_id, u.name AS member_name, r.title, r.image_path, c.cost, c.status, c.claimed_at
         FROM reward_claims c JOIN rewards r ON r.id = c.reward_id JOIN users u ON u.id = c.member_id
         WHERE c.member_id = ? ORDER BY c.id DESC`,
      )
      .all(memberId) as any[]
  }
  return db
    .prepare(
      `SELECT c.id, c.member_id, u.name AS member_name, r.title, r.image_path, c.cost, c.status, c.claimed_at
       FROM reward_claims c JOIN rewards r ON r.id = c.reward_id JOIN users u ON u.id = c.member_id
       ORDER BY c.id DESC`,
    )
    .all() as any[]
}

export function resolveClaim(claimId: number, adminId: number, approve: boolean) {
  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(claimId) as any | undefined
  if (!claim) throw new Error('Reward claim not found')
  if (claim.status !== 'pending') throw new Error('Reward claim is not pending')

  if (approve) {
    db.prepare(
      `UPDATE reward_claims SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
    ).run(adminId, claimId)
    db.prepare(`UPDATE ledger_entries SET status = 'approved' WHERE reference_type = 'reward_claim' AND reference_id = ?`).run(claimId)
  } else {
    reverseLedger('reward_claim', claimId, `Reward claim #${claimId} rejected`)
    db.prepare(`UPDATE reward_claims SET status = 'rejected', approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(
      adminId,
      claimId,
    )
  }
}
