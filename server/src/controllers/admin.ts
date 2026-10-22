import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { HttpError } from '../middlewares/error.js'
import { countMembers } from '../models/user.js'
import { approvedTotal, approveWithdrawal, countByStatus as withdrawalCount, findWithdrawal, listAllWithdrawals, rejectWithdrawal } from '../services/withdrawal.js'
import { totalPaidCommission, generateCommissions } from '../services/commission.js'
import { createReward, listClaims, listRewards, resolveClaim } from '../services/reward.js'
import { evaluateRank, listRanks, runMonthlySalary } from '../services/rank.js'
import { buildXlsx } from '../utils/xlsx.js'
import * as svc from '../services/admin.js'

function getAdminId(req: Request): number {
  return req.user!.id
}

export function summary(_req: Request, res: Response) {
  const base = {
    total_members: countMembers(),
    active_members: svc.countRows(`SELECT COUNT(*) AS c FROM users WHERE status = 'active'`),
    verified_members: svc.countRows(`SELECT COUNT(*) AS c FROM users WHERE verification_status = 'verified'`),
    pending_withdrawals: withdrawalCount('pending'),
    approved_withdrawal_total: approvedTotal(),
    paid_commission_total: totalPaidCommission(),
  }
  res.json({ ...base, ...svc.platformSummary() })
}

export function members(req: Request, res: Response) {
  const q = String(req.query.q ?? req.query.search ?? '')
  const result = svc.listMembersPage({
    q,
    status: req.query.status ? String(req.query.status) : undefined,
    verification: req.query.verification ? String(req.query.verification) : undefined,
    page: Number(req.query.page ?? req.query.offset ? undefined : 1),
    perPage: Number(req.query.perPage ?? req.query.limit ?? 25),
  })
  res.json({ items: result.items, total: result.total })
}

export function memberShow(req: Request, res: Response) {
  const id = Number(req.params.id)
  const detail = svc.memberDetail(id)
  if (!detail) throw new HttpError(404, 'Member not found')
  res.json(detail)
}

export function updateMember(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'suspended', 'terminated']).optional(),
    verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    address_line: z.string().optional().nullable(),
    emergency_contact: z.string().optional().nullable(),
    roles: z.array(z.enum(['member', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'])).optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)

  if (data.status || data.name || data.email || data.phone || data.country || data.city || data.address_line || data.emergency_contact) {
    const result = svc.updateMemberDetails(id, {
      name: data.name ?? '',
      email: data.email ?? '',
      phone: data.phone,
      status: data.status ?? 'active',
      country: data.country,
      city: data.city,
      address_line: data.address_line,
      emergency_contact: data.emergency_contact,
    })
    if (!result) throw new HttpError(404, 'Member not found')
  }
  if (data.verification_status) {
    svc.verifyMemberIdentity(id, data.verification_status === 'verified' ? 'verified' : 'rejected')
  }
  if (data.roles) {
    // assign primary role
    if (data.roles.length) {
      svc.assignRole(id, data.roles[0])
    }
  }

  svc.recordAudit(getAdminId(req), 'member.updated', 'user', id, data, req.ip)
  res.json({ success: true })
}

export function deleteMember(req: Request, res: Response) {
  const id = Number(req.params.id)
  const removed = svc.deleteMember(id)
  if (!removed) throw new HttpError(404, 'Member not found')
  svc.recordAudit(getAdminId(req), 'member.deleted', 'user', id, removed, req.ip)
  res.json({ success: true })
}

export function memberVerify(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({
    decision: z.enum(['verified', 'rejected']).optional().default('verified'),
    note: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body ?? {})
  svc.verifyMemberIdentity(id, data.decision as 'verified' | 'rejected')
  svc.recordAudit(getAdminId(req), `member.${data.decision}`, 'user', id, { note: data.note ?? null }, req.ip)
  res.json({ success: true })
}

export function memberSuspend(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ reason: z.string().optional() })
  const data = schema.parse(req.body)
  svc.suspendMember(id, data.reason ?? 'Suspended by admin')
  svc.recordAudit(getAdminId(req), 'member.suspended', 'user', id, data, req.ip)
  res.json({ success: true })
}

export function memberActivate(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.activateMember(id)
  svc.recordAudit(getAdminId(req), 'member.activated', 'user', id, {}, req.ip)
  res.json({ success: true })
}

export function memberSponsor(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ sponsor_id: z.coerce.number().int().positive() })
  const data = schema.parse(req.body)
  svc.changeSponsor(id, data.sponsor_id)
  svc.recordAudit(getAdminId(req), 'member.sponsor.changed', 'user', id, data, req.ip)
  res.json({ success: true })
}

export function verifications(_req: Request, res: Response) {
  res.json(svc.pendingVerifications())
}

export function roles(req: Request, res: Response) {
  const search = String(req.query.q ?? '')
  res.json(svc.rolesOverview(search))
}

export function assignRole(req: Request, res: Response) {
  const userId = Number(req.params.user)
  const schema = z.object({ role: z.string() })
  const data = schema.parse(req.body)
  const ok = svc.assignRole(userId, data.role)
  if (!ok) throw new HttpError(400, 'Invalid role')
  svc.recordAudit(getAdminId(req), 'role.assigned', 'user', userId, data, req.ip)
  res.json({ success: true })
}

export function transactions(req: Request, res: Response) {
  const result = svc.transactionsPage({
    q: String(req.query.q ?? ''),
    status: req.query.status ? String(req.query.status) : undefined,
    page: Number(req.query.page ?? 1),
    perPage: Number(req.query.perPage ?? 25),
  })
  res.json(result)
}

export function storeTransaction(req: Request, res: Response) {
  const schema = z.object({
    member_code: z.string().min(1),
    type: z.string().min(1),
    gross_amount: z.coerce.number().positive(),
    eligible_amount: z.coerce.number().positive(),
    description: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const created = svc.createTransaction({
    memberCode: data.member_code,
    type: data.type,
    grossAmount: data.gross_amount,
    eligibleAmount: data.eligible_amount,
    description: data.description,
  })
  if (!created) throw new HttpError(404, 'Member not found')
  svc.recordAudit(getAdminId(req), 'transaction.created', 'business_transaction', created.id, data, req.ip)
  res.status(201).json(created)
}

export function verifyTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ eligible_amount: z.coerce.number().positive().optional().nullable() }).partial()
  const data = schema.parse(req.body)
  const result = svc.verifyTransaction(id, data.eligible_amount)
  if (!result) throw new HttpError(404, 'Transaction not found')
  svc.recordAudit(getAdminId(req), 'transaction.verified', 'business_transaction', id, data, req.ip)
  res.json({ success: true })
}

export function rejectTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.rejectTransaction(id)
  svc.recordAudit(getAdminId(req), 'transaction.rejected', 'business_transaction', id, {}, req.ip)
  res.json({ success: true })
}

export function reverseTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = svc.reverseTransaction(id)
  if (!result) throw new HttpError(404, 'Transaction not found')
  svc.recordAudit(getAdminId(req), 'transaction.reversed', 'business_transaction', id, {}, req.ip)
  res.json({ success: true })
}

export function ledger(req: Request, res: Response) {
  const result = svc.ledgerEntries({
    q: String(req.query.q ?? ''),
    type: req.query.type ? String(req.query.type) : undefined,
  })
  res.json(result)
}

export function deposits(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  res.json(svc.depositsPage(status))
}

export function verifyDeposit(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.verifyDeposit(id)
  svc.recordAudit(getAdminId(req), 'deposit.verified', 'deposit', id, {}, req.ip)
  res.json({ success: true })
}

export function rejectDeposit(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.rejectDeposit(id)
  svc.recordAudit(getAdminId(req), 'deposit.rejected', 'deposit', id, {}, req.ip)
  res.json({ success: true })
}

export function withdrawals(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  const rows = svc.withdrawalsList(status)
  res.json(rows)
}

export function resolveWithdrawal(req: Request, res: Response) {
  const schema = z.object({
    action: z.enum(['approve', 'reject', 'pay']),
    notes: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  const adminId = getAdminId(req)

  if (data.action === 'approve') {
    const result = svc.approveWithdrawalRequest(id, adminId, data.notes ?? data.reason)
    if (!result) throw new HttpError(400, 'Unable to approve withdrawal')
  } else if (data.action === 'reject') {
    const result = svc.rejectWithdrawalRequest(id, adminId, data.reason ?? data.notes)
    if (!result) throw new HttpError(400, 'Unable to reject withdrawal')
  } else if (data.action === 'pay') {
    const result = svc.payWithdrawalRequest(id, adminId)
    if (!result) throw new HttpError(400, 'Unable to mark withdrawal as paid')
  }

  svc.recordAudit(getAdminId(req), `withdrawal.${data.action}d`, 'withdrawal_request', id, data, req.ip)
  const updated = findWithdrawal(id)
  res.json({ success: true, status: updated?.status ?? null })
}

export function approveWithdrawalLegacy(req: Request, res: Response) {
  const schema = z.object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  if (data.action === 'approve') approveWithdrawal(id, req.user!.id, data.notes)
  else rejectWithdrawal(id, req.user!.id, data.notes)
  dbAudit(req, `withdrawal.${data.action}d`, id, data)
  res.json(dbPrepare(req, id))
}

function dbAudit(req: Request, action: string, id: number, data: unknown) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    req.user!.id,
    action,
    'withdrawal_request',
    id,
    JSON.stringify(data),
  )
}

function dbPrepare(req: Request, id: number) {
  return db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id)
}

export function reconciliation(req: Request, res: Response) {
  res.json(svc.reconciliationRecords())
}

export function runReconciliation(req: Request, res: Response) {
  const result = svc.runReconciliation()
  svc.recordAudit(getAdminId(req), 'reconciliation.run', null, null, result, req.ip)
  res.json(result)
}

export function plans(req: Request, res: Response) {
  res.json(svc.listPlans())
}

export function storePlan(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1),
    commission_base: z.string().optional(),
    commissionBase: z.string().optional(),
    effective_from: z.string().optional().nullable(),
    eligible_types: z.array(z.string()).optional(),
    eligibleTypes: z.array(z.string()).optional(),
    notes: z.string().optional().nullable(),
    rates: z.array(z.object({ generation_from: z.coerce.number(), generation_to: z.coerce.number(), rate: z.coerce.number() })),
  })
  const data = schema.parse(req.body)
  const planId = svc.createPlan(
    {
      name: data.name,
      commissionBase: data.commissionBase ?? data.commission_base ?? 'eligible_verified_amount',
      effectiveFrom: data.effective_from,
      eligibleTypes: data.eligibleTypes ?? data.eligible_types ?? ['sale'],
      notes: data.notes,
      rates: data.rates,
    },
    getAdminId(req),
  )
  svc.recordAudit(getAdminId(req), 'compensation_plan.created', 'compensation_plan', planId, data, req.ip)
  res.status(201).json({ id: planId })
}

export function activatePlan(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.activatePlan(id, getAdminId(req))
  svc.recordAudit(getAdminId(req), 'compensation_plan.activated', 'compensation_plan', id, {}, req.ip)
  res.json({ success: true })
}

export function planPreview(req: Request, res: Response) {
  const id = Number(req.params.id)
  const plan = svc.planDetail(id)
  if (!plan) throw new HttpError(404, 'Plan not found')
  res.json(plan)
}

export function commissions(req: Request, res: Response) {
  const result = svc.commissionsPage({
    q: String(req.query.q ?? ''),
    status: req.query.status ? String(req.query.status) : undefined,
    page: Number(req.query.page ?? 1),
    perPage: Number(req.query.perPage ?? 25),
  })
  res.json(result)
}

export function commissionPreview(req: Request, res: Response) {
  const reference = String(req.query.reference ?? '')
  const result = svc.commissionPreview(reference)
  res.json(result)
}

export function commissionExceptions(_req: Request, res: Response) {
  res.json(svc.commissionExceptions())
}

export function approveCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = svc.approveCommission(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to approve commission')
  svc.recordAudit(getAdminId(req), 'commission.approved', 'commission', id, {}, req.ip)
  res.json(result)
}

export function rejectCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ reason: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const result = svc.rejectCommission(id, getAdminId(req), data.reason)
  if (!result) throw new HttpError(400, 'Unable to reject commission')
  svc.recordAudit(getAdminId(req), 'commission.rejected', 'commission', id, data, req.ip)
  res.json(result)
}

export function payCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = svc.payCommission(id)
  if (!result) throw new HttpError(400, 'Unable to pay commission')
  svc.recordAudit(getAdminId(req), 'commission.paid', 'commission', id, {}, req.ip)
  res.json(result)
}

export function ranks(_req: Request, res: Response) {
  res.json(svc.ranksAdmin())
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
      `INSERT INTO ranks (code, name, level, salary, min_direct_links, downline_volume, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(data.code, data.name, data.level, data.salary, data.min_direct_links, data.downline_volume)
  svc.recordAudit(getAdminId(req), 'rank.created', 'rank', Number(info.lastInsertRowid), data, req.ip)
  res.status(201).json(db.prepare('SELECT * FROM ranks WHERE id = ?').get(Number(info.lastInsertRowid)))
}

export function updateRank(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({
    monthly_salary: z.coerce.number().min(0).optional(),
    salary: z.coerce.number().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  const data = schema.parse(req.body)
  svc.updateRank(id, data.monthly_salary ?? data.salary ?? 0, data.is_active ?? true)
  svc.recordAudit(getAdminId(req), 'rank.updated', 'rank', id, data, req.ip)
  res.json({ success: true })
}

export function recalculateRanks(req: Request, res: Response) {
  const period = String(req.query.period ?? new Date().toISOString().slice(0, 7))
  const result = svc.recalculateRankReport(period)
  svc.recordAudit(getAdminId(req), 'ranks.recalculated', null, null, result, req.ip)
  res.json(result)
}

export function rankReports(req: Request, res: Response) {
  const period = String(req.query.period ?? new Date().toISOString().slice(0, 7))
  res.json(svc.rankReport(period))
}

export function recalculateRankReports(req: Request, res: Response) {
  const schema = z.object({ period: z.string().optional() })
  const data = schema.parse(req.body)
  const period = data.period ?? new Date().toISOString().slice(0, 7)
  const result = svc.recalculateRankReport(period)
  svc.recordAudit(getAdminId(req), 'rank_reports.recalculated', null, null, result, req.ip)
  res.json(result)
}

export function salary(req: Request, res: Response) {
  const result = svc.salaryPage({
    period: req.query.period ? String(req.query.period) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
  })
  res.json(result)
}

export function generateSalary(req: Request, res: Response) {
  const schema = z.object({ period: z.string().optional() })
  const data = schema.parse(req.body)
  const period = data.period ?? new Date().toISOString().slice(0, 7)
  const result = svc.generateSalary(period)
  svc.recordAudit(getAdminId(req), 'salary.generated', null, null, result, req.ip)
  res.json(result)
}

export function approveSalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = svc.approveSalary(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to approve salary')
  svc.recordAudit(getAdminId(req), 'salary.approved', 'salary_payout', id, {}, req.ip)
  res.json(result)
}

export function rejectSalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ reason: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const result = svc.rejectSalary(id, getAdminId(req), data.reason)
  if (!result) throw new HttpError(400, 'Unable to reject salary')
  svc.recordAudit(getAdminId(req), 'salary.rejected', 'salary_payout', id, data, req.ip)
  res.json(result)
}

export function paySalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = svc.paySalary(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to pay salary')
  svc.recordAudit(getAdminId(req), 'salary.paid', 'salary_payout', id, {}, req.ip)
  res.json(result)
}

export function rewards(_req: Request, res: Response) {
  res.json(svc.rewardsAdmin())
}

export function storeReward(req: Request, res: Response) {
  const schema = z.object({
    title: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    cost: z.coerce.number().min(0).optional(),
    threshold_amount: z.coerce.number().min(0).optional(),
    budget: z.coerce.number().min(0).optional().nullable(),
    max_claims: z.coerce.number().int().min(0).optional().nullable(),
    required_rank_id: z.coerce.number().int().optional().nullable(),
    is_active: z.boolean().optional(),
    image_path: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  if (data.name || data.title) {
    const id = createReward({ title: data.name ?? data.title!, description: data.description ?? undefined, imagePath: data.image_path, cost: data.cost ?? data.threshold_amount ?? 0 })
    svc.recordAudit(getAdminId(req), 'reward.created', 'reward', id, data, req.ip)
    res.status(201).json({ id })
    return
  }
  res.status(201).json({ success: true })
}

export function updateReward(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({
    title: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional().nullable(),
    threshold_amount: z.coerce.number().min(0).optional().nullable(),
    cost: z.coerce.number().min(0).optional().nullable(),
    budget: z.coerce.number().min(0).optional().nullable(),
    max_claims: z.coerce.number().int().min(0).optional().nullable(),
    required_rank_id: z.coerce.number().int().optional().nullable(),
    is_active: z.boolean().optional(),
  })
  const data = schema.parse(req.body)
  const result = svc.updateReward(id, {
    name: data.name ?? data.title,
    description: data.description,
    threshold_amount: data.threshold_amount ?? data.cost,
    budget: data.budget,
    max_claims: data.max_claims,
    required_rank_id: data.required_rank_id,
    is_active: data.is_active,
  })
  if (!result) throw new HttpError(404, 'Reward not found')
  svc.recordAudit(getAdminId(req), 'reward.updated', 'reward', id, data, req.ip)
  res.json({ success: true })
}

export function rewardClaims(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  res.json(svc.rewardClaimsPage(status))
}

export function resolveRewardClaim(req: Request, res: Response) {
  const schema = z.object({ action: z.enum(['approve', 'reject']), note: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  if (data.action === 'approve') {
    const result = svc.approveRewardClaim(id, getAdminId(req), data.note)
    if (!result) throw new HttpError(400, 'Unable to approve reward claim')
  } else {
    const result = svc.rejectRewardClaim(id, getAdminId(req), data.note)
    if (!result) throw new HttpError(400, 'Unable to reject reward claim')
  }
  svc.recordAudit(getAdminId(req), `reward_claim.${data.action}d`, 'reward_claim', id, data, req.ip)
  res.json({ success: true })
}

export function announcements(req: Request, res: Response) {
  res.json(svc.announcementsList())
}

export function storeAnnouncement(req: Request, res: Response) {
  const schema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    audience: z.string().min(1),
    severity: z.string().min(1),
    expires_at: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const id = svc.createAnnouncement(data, getAdminId(req))
  svc.recordAudit(getAdminId(req), 'announcement.created', 'announcement', id, data, req.ip)
  res.status(201).json({ id })
}

export function publishAnnouncement(req: Request, res: Response) {
  const id = Number(req.params.id)
  svc.publishAnnouncement(id)
  svc.recordAudit(getAdminId(req), 'announcement.published', 'announcement', id, {}, req.ip)
  res.json({ success: true })
}

export function auditLogs(req: Request, res: Response) {
  const result = svc.auditLogsPage({
    q: String(req.query.q ?? ''),
    action: req.query.action ? String(req.query.action) : undefined,
    page: Number(req.query.page ?? 1),
    perPage: Number(req.query.perPage ?? 25),
  })
  res.json(result)
}

export function jobs(req: Request, res: Response) {
  const result = svc.jobRunsPage({
    job: req.query.job ? String(req.query.job) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
  })
  res.json(result)
}

export function settings(req: Request, res: Response) {
  res.json(svc.settingsOverview())
}

export function updateSettings(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    svc.updateSetting(key, String(value))
  }
  svc.recordAudit(getAdminId(req), 'settings.updated', null, null, body, req.ip)
  res.json({ success: true })
}

export function report(req: Request, res: Response) {
  const format = String(req.query.format ?? 'xlsx')
  const rows = svc.reportExportRows(svc.reportMetrics(String(req.query.from ?? '1970-01-01'), String(req.query.to ?? '2100-01-01')))
  if (format === 'csv') {
    const header = 'Metric,Value'
    const body = rows.map(([k, v]) => `"${k.replace(/"/g, '""')}","${v.replace(/"/g, '""')}"`).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="nexora-report.csv"')
    res.send(`${header}\n${body}`)
    return
  }
  const columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  const data = rows.map(([metric, value]) => ({ metric, value }))
  const workbook = buildXlsx('Report', columns, data)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="nexora-report.xlsx"')
  res.send(workbook)
}

export function reportLegacy(req: Request, res: Response) {
  // Keep compatibility with existing /admin/report
  return report(req, res)
}

export function network(req: Request, res: Response) {
  const memberCode = String(req.query.member_code ?? req.query.member ?? '')
  const depth = Number(req.query.depth ?? 3)
  if (!memberCode) throw new HttpError(400, 'member_code is required')
  const result = svc.networkExplorer(memberCode, depth)
  if (!result) throw new HttpError(404, 'Member not found')
  res.json(result)
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
    .prepare(`INSERT INTO business_transactions (member_id, reference, gross_amount, eligible_amount, amount, type, status, created_at) VALUES (?, ?, ?, ?, ?, 'purchase', 'approved', datetime('now'))`)
    .run(data.member_id, reference, data.amount, data.amount, data.amount)
  const transactionId = Number(info.lastInsertRowid)

  const commissions = generateCommissions(data.member_id, transactionId, data.amount)
  svc.recordAudit(getAdminId(req), 'purchase.recorded', 'business_transaction', transactionId, data, req.ip)

  res.status(201).json({ transaction_id: transactionId, reference, commissions })
}

export function runSalaryLegacy(_req: Request, res: Response) {
  const reference = new Date().toISOString().slice(0, 7)
  res.json(runMonthlySalary(reference))
}

export function ranksLegacy(_req: Request, res: Response) {
  res.json(listRanks())
}

export function recalculateRanksLegacy(req: Request, res: Response) {
  const members = db.prepare(`SELECT id FROM users WHERE status = 'active'`).all() as { id: number }[]
  let promoted = 0
  for (const member of members) {
    const rank = evaluateRank(member.id)
    if (rank) promoted += 1
  }
  res.json({ evaluated: members.length, ranked: promoted })
}
