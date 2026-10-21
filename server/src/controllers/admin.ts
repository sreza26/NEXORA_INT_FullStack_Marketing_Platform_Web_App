import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { HttpError } from '../middlewares/error.js'
import { countByStatus, countByVerification, countMembers, listMembers } from '../models/user.js'
import { approvedTotal, approveWithdrawal, countByStatus as withdrawalCount, listAllWithdrawals, rejectWithdrawal } from '../services/withdrawal.js'
import { totalPaidCommission, generateCommissions } from '../services/commission.js'
import { createReward, listClaims, listRewards, resolveClaim } from '../services/reward.js'
import { evaluateRank, listRanks, runMonthlySalary } from '../services/rank.js'
import { buildXlsx } from '../utils/xlsx.js'

export function summary(_req: Request, res: Response) {
  res.json({
    total_members: countMembers(),
    active_members: countByStatus('active'),
    verified_members: countByVerification('verified'),
    pending_withdrawals: withdrawalCount('pending'),
    approved_withdrawal_total: approvedTotal(),
    paid_commission_total: totalPaidCommission(),
  })
}

export function members(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 50)
  const offset = Number(req.query.offset ?? 0)
  const search = String(req.query.search ?? '')
  res.json({ items: listMembers(limit, offset, search), total: countMembers() })
}

export function updateMember(req: Request, res: Response) {
  const schema = z.object({
    status: z.enum(['pending', 'active', 'suspended']).optional(),
    verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
    roles: z.array(z.enum(['member', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'])).optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
  if (!user) throw new HttpError(404, 'Member not found')

  if (data.status) {
    db.prepare(
      `UPDATE users SET status = ?, suspended_at = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(data.status, data.status === 'suspended' ? new Date().toISOString() : null, id)
  }
  if (data.verification_status) {
    db.prepare(`UPDATE users SET verification_status = ?, updated_at = datetime('now') WHERE id = ?`).run(data.verification_status, id)
  }
  if (data.roles) {
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id)
    for (const role of data.roles) {
      const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number } | undefined
      if (roleRow) db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(id, roleRow.id)
    }
  }

  db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    req.user!.id,
    'member.updated',
    'user',
    id,
    JSON.stringify(data),
  )

  res.json(db.prepare('SELECT id, name, email, member_code, status, verification_status FROM users WHERE id = ?').get(id))
}

export function withdrawals(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  res.json(listAllWithdrawals(status))
}

export function resolveWithdrawal(req: Request, res: Response) {
  const schema = z.object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)

  if (data.action === 'approve') approveWithdrawal(id, req.user!.id, data.notes)
  else rejectWithdrawal(id, req.user!.id, data.notes)

  db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    req.user!.id,
    `withdrawal.${data.action}d`,
    'withdrawal_request',
    id,
    JSON.stringify(data),
  )

  res.json(db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id))
}

export function rewards(_req: Request, res: Response) {
  res.json({ rewards: listRewards(false), claims: listClaims() })
}

export function storeReward(req: Request, res: Response) {
  const schema = z.object({
    title: z.string().min(2, 'Title is required'),
    description: z.string().optional(),
    cost: z.coerce.number().min(0),
    image_path: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const id = createReward(data)
  res.status(201).json(db.prepare('SELECT * FROM rewards WHERE id = ?').get(id))
}

export function resolveRewardClaim(req: Request, res: Response) {
  const schema = z.object({ action: z.enum(['approve', 'reject']) })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  resolveClaim(id, req.user!.id, data.action === 'approve')
  res.json(db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(id))
}

export function ranks(_req: Request, res: Response) {
  res.json(listRanks())
}

export function storeRank(req: Request, res: Response) {
  const schema = z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    level: z.coerce.number().int().min(1),
    salary: z.coerce.number().min(0),
    min_direct_links: z.coerce.number().int().min(0).default(0),
    downline_volume: z.coerce.number().min(0).default(0),
  })
  const data = schema.parse(req.body)
  const info = db
    .prepare(
      `INSERT INTO ranks (code, name, level, salary, min_direct_links, downline_volume) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(data.code, data.name, data.level, data.salary, data.min_direct_links, data.downline_volume)
  res.status(201).json(db.prepare('SELECT * FROM ranks WHERE id = ?').get(Number(info.lastInsertRowid)))
}

export function recalculateRanks(req: Request, res: Response) {
  const members = db.prepare(`SELECT id FROM users WHERE status = 'active'`).all() as { id: number }[]
  let promoted = 0
  for (const member of members) {
    const rank = evaluateRank(member.id)
    if (rank) promoted += 1
  }
  res.json({ evaluated: members.length, ranked: promoted })
}

export function recordPurchase(req: Request, res: Response) {
  const schema = z.object({
    member_id: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    reference: z.string().optional(),
  })
  const data = schema.parse(req.body)

  const member = db.prepare('SELECT id FROM users WHERE id = ?').get(data.member_id)
  if (!member) throw new HttpError(404, 'Member not found')

  const reference = data.reference ?? `PUR-${Date.now()}-${data.member_id}`
  const existing = db.prepare('SELECT id FROM business_transactions WHERE reference = ?').get(reference)
  if (existing) throw new HttpError(422, 'This reference has already been recorded')

  const info = db
    .prepare(`INSERT INTO business_transactions (member_id, reference, amount, type, status) VALUES (?, ?, ?, 'purchase', 'approved')`)
    .run(data.member_id, reference, data.amount)
  const transactionId = Number(info.lastInsertRowid)

  const commissions = generateCommissions(data.member_id, transactionId, data.amount)

  res.status(201).json({ transaction_id: transactionId, reference, commissions })
}

export function runSalary(_req: Request, res: Response) {
  const reference = new Date().toISOString().slice(0, 7)
  res.json(runMonthlySalary(reference))
}

export function report(req: Request, res: Response) {
  const format = String(req.query.format ?? 'xlsx')
  const rows = db
    .prepare(
      `SELECT u.member_code, u.name, u.email, u.status, u.verification_status, u.created_at,
              COALESCE(w.balance, 0) AS balance, r.name AS rank
       FROM users u
       LEFT JOIN wallet_accounts w ON w.member_id = u.id
       LEFT JOIN ranks r ON r.id = u.current_rank_id
       ORDER BY u.id ASC`,
    )
    .all() as any[]

  if (format === 'csv') {
    const header = 'member_code,name,email,status,verification_status,balance,rank,created_at'
    const body = rows
      .map((r) =>
        [r.member_code, r.name, r.email, r.status, r.verification_status, r.balance, r.rank ?? '', r.created_at]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="nexora-members.csv"')
    res.send(`${header}\n${body}`)
    return
  }

  const columns = [
    { header: 'Member code', key: 'member_code', width: 16 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Verification', key: 'verification_status', width: 16 },
    { header: 'Balance', key: 'balance', width: 14 },
    { header: 'Rank', key: 'rank', width: 18 },
    { header: 'Registered', key: 'created_at', width: 22 },
  ]

  const workbook = buildXlsx('Members', columns, rows)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="nexora-members.xlsx"')
  res.send(workbook)
}
