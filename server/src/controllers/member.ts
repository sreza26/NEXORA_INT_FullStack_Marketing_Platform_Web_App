import type { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../middlewares/error.js'
import { listLedger, walletBalance } from '../models/ledger.js'
import { listCommissions, totalCommissionFor } from '../services/commission.js'
import { directReferrals, downlineCounts, teamVolume, totalNetworkSize } from '../services/tree.js'
import { listWithdrawals, createWithdrawal } from '../services/withdrawal.js'
import { listRewards, claimReward, listClaims } from '../services/reward.js'
import { achievements, evaluateRank, rankOf } from '../services/rank.js'
import { db } from '../db/index.js'
import { config } from '../config/index.js'

export function summary(req: Request, res: Response) {
  const memberId = req.user!.id
  const user = db.prepare('SELECT id, name, email, member_code, status, verification_status FROM users WHERE id = ?').get(memberId)

  res.json({
    user,
    wallet: { balance: walletBalance(memberId), currency: config.currency },
    direct_referrals: directReferrals(memberId).length,
    total_network: totalNetworkSize(memberId),
    team_volume: teamVolume(memberId),
    rank: rankOf(memberId),
    pending_withdrawals: (
      db.prepare(`SELECT COUNT(*) AS c FROM withdrawal_requests WHERE member_id = ? AND status = 'pending'`).get(memberId) as {
        c: number
      }
    ).c,
    commission_total: totalCommissionFor(memberId),
    levels: downlineCounts(memberId),
  })
}

export function referrals(req: Request, res: Response) {
  res.json(directReferrals(req.user!.id))
}

export function network(req: Request, res: Response) {
  const memberId = req.user!.id
  res.json({
    levels: downlineCounts(memberId),
    total: totalNetworkSize(memberId),
    volume: teamVolume(memberId),
    referral_link: `${config.appUrl}/r/${req.user!.member_code}`,
  })
}

export function commissions(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 100)
  const offset = Number(req.query.offset ?? 0)
  res.json({
    total: totalCommissionFor(req.user!.id),
    items: listCommissions(req.user!.id, limit, offset),
  })
}

export function ledger(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 100)
  const offset = Number(req.query.offset ?? 0)
  res.json({
    balance: walletBalance(req.user!.id),
    items: listLedger(req.user!.id, limit, offset),
  })
}

export function withdrawals(req: Request, res: Response) {
  res.json(listWithdrawals(req.user!.id))
}

export function storeWithdrawal(req: Request, res: Response) {
  const schema = z.object({
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    method: z.enum(['bank', 'mobile', 'crypto']),
    account_details: z.string().min(4, 'Account details are required'),
  })
  const data = schema.parse(req.body)

  const result = createWithdrawal({
    memberId: req.user!.id,
    amount: data.amount,
    method: data.method,
    accountDetails: data.account_details,
  })

  res.status(201).json({ id: result.id, balance: result.balance })
}

export function rewards(req: Request, res: Response) {
  res.json({ rewards: listRewards(true), claims: listClaims(req.user!.id) })
}

export function storeRewardClaim(req: Request, res: Response) {
  const schema = z.object({ reward_id: z.coerce.number().int().positive() })
  const data = schema.parse(req.body)
  const claimId = claimReward(req.user!.id, data.reward_id)
  res.status(201).json({ id: claimId })
}

export function rank(req: Request, res: Response) {
  const memberId = req.user!.id
  const evaluated = evaluateRank(memberId)
  res.json({ rank: rankOf(memberId), evaluated, achievements: achievements(memberId) })
}

export function profile(req: Request, res: Response) {
  const memberId = req.user!.id
  const row = db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(memberId) as any
  if (!row) throw new HttpError(404, 'Profile not found')
  res.json(row)
}

export function updateProfile(req: Request, res: Response) {
  const schema = z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const memberId = req.user!.id

  db.prepare(
    `UPDATE member_profiles SET address = ?, city = ?, country = ?, postal_code = ?, updated_at = datetime('now')
     WHERE member_id = ?`,
  ).run(data.address ?? null, data.city ?? null, data.country ?? null, data.postal_code ?? null, memberId)

  res.json(db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(memberId))
}
