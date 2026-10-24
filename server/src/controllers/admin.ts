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
import { invalidateSetting } from '../services/settings.js'

function getAdminId(req: Request): number {
  return req.user!.id
}

function isDeveloper(req: Request): boolean {
  return (req.user?.roles ?? []).includes('developer')
}

/**
 * Developer accounts are staff tooling: only another developer may open or
 * mutate them. Everyone else gets a 404 so the account stays invisible.
 */
async function assertTargetVisible(req: Request, id: number): Promise<void> {
  if (!isDeveloper(req) && (await svc.isDeveloperUser(id))) {
    throw new HttpError(404, 'Member not found')
  }
}

export async function summary(_req: Request, res: Response) {
  const notDeveloper = `NOT EXISTS (SELECT 1 FROM user_roles urd JOIN roles rd ON rd.id = urd.role_id WHERE urd.user_id = users.id AND rd.name = 'developer')`
  const base = {
    total_members: await countMembers(),
    active_members: await svc.countRows(`SELECT COUNT(*) AS c FROM users WHERE status = 'active' AND ${notDeveloper}`),
    verified_members: await svc.countRows(
          `SELECT COUNT(*) AS c FROM users WHERE verification_status = 'verified' AND ${notDeveloper}`,
        ),
    pending_withdrawals: await withdrawalCount('pending'),
    approved_withdrawal_total: await approvedTotal(),
    paid_commission_total: await totalPaidCommission(),
  }
  res.json({ ...base, ...await svc.platformSummary() })
}

export async function members(req: Request, res: Response) {
  const q = String(req.query.q ?? req.query.search ?? '')
  const result = await svc.listMembersPage({
      q,
      status: req.query.status ? String(req.query.status) : undefined,
      verification: req.query.verification ? String(req.query.verification) : undefined,
      page: Number(req.query.page ?? req.query.offset ? undefined : 1),
      perPage: Number(req.query.perPage ?? req.query.limit ?? 25),
    })
  res.json({ items: result.items, total: result.total })
}

export async function memberShow(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  const detail = await svc.memberDetail(id)
  if (!detail) throw new HttpError(404, 'Member not found')
  res.json(detail)
}

export async function updateMember(req: Request, res: Response) {
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
    roles: z
      .array(z.enum(['member', 'developer', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent']))
      .optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  if (data.roles?.includes('developer') && !isDeveloper(req)) {
    throw new HttpError(403, 'You do not have permission to perform this action.')
  }

  if (data.status || data.name || data.email || data.phone || data.country || data.city || data.address_line || data.emergency_contact) {
    const result = await svc.updateMemberDetails(id, {
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
    await svc.verifyMemberIdentity(id, data.verification_status === 'verified' ? 'verified' : 'rejected')
  }
  if (data.roles) {
    // assign primary role
    if (data.roles.length) {
      await svc.assignRole(id, data.roles[0])
    }
  }

  await svc.recordAudit(getAdminId(req), 'member.updated', 'user', id, data, req.ip)
  res.json({ success: true })
}

export async function deleteMember(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  const removed = await svc.deleteMember(id)
  if (!removed) throw new HttpError(404, 'Member not found')
  await svc.recordAudit(getAdminId(req), 'member.deleted', 'user', id, removed, req.ip)
  res.json({ success: true })
}

export async function memberVerify(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  const schema = z.object({
    decision: z.enum(['verified', 'rejected']).optional().default('verified'),
    note: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body ?? {})
  await svc.verifyMemberIdentity(id, data.decision as 'verified' | 'rejected')
  await svc.recordAudit(getAdminId(req), `member.${data.decision}`, 'user', id, { note: data.note ?? null }, req.ip)
  res.json({ success: true })
}

export async function memberSuspend(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  const schema = z.object({ reason: z.string().optional() })
  const data = schema.parse(req.body)
  await svc.suspendMember(id, data.reason ?? 'Suspended by admin')
  await svc.recordAudit(getAdminId(req), 'member.suspended', 'user', id, data, req.ip)
  res.json({ success: true })
}

export async function memberActivate(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  await svc.activateMember(id)
  await svc.recordAudit(getAdminId(req), 'member.activated', 'user', id, {}, req.ip)
  res.json({ success: true })
}

export async function memberSponsor(req: Request, res: Response) {
  const id = Number(req.params.id)
  await assertTargetVisible(req, id)
  const schema = z.object({
    sponsor_id: z.coerce.number().int().positive().optional(),
    sponsor_code: z.string().optional(),
    reason: z.string().optional(),
  })
  const data = schema.parse(req.body)

  let sponsorId = data.sponsor_id
  if (!sponsorId && data.sponsor_code) {
    const sponsor = (await db
      .prepare('SELECT id FROM users WHERE member_code = ?')
      .get(data.sponsor_code.trim().toUpperCase())) as { id: number } | undefined
    if (!sponsor) throw new HttpError(404, 'Sponsor not found')
    sponsorId = sponsor.id
  }
  if (!sponsorId) throw new HttpError(422, 'sponsor_code is required')

  await svc.changeSponsor(id, sponsorId)
  await svc.recordAudit(getAdminId(req), 'member.sponsor.changed', 'user', id, { ...data, sponsor_id: sponsorId }, req.ip)
  res.json({ success: true })
}

export async function verifications(_req: Request, res: Response) {
  res.json(await svc.pendingVerifications())
}

export async function demoDataStatus(_req: Request, res: Response) {
  res.json(await svc.demoDataReport())
}

export async function purgeDemoData(req: Request, res: Response) {
  const schema = z.object({ confirm: z.literal('DELETE') })
  schema.parse(req.body ?? {})
  const result = await svc.deleteDemoData()
  if (result.deleted) {
    await svc.recordAudit(getAdminId(req), 'demo_data.deleted', 'system', null, result, req.ip)
  }
  res.json(result)
}

export async function roles(req: Request, res: Response) {
  const search = String(req.query.q ?? '')
  res.json(await svc.rolesOverview(search, isDeveloper(req)))
}

export async function assignRole(req: Request, res: Response) {
  const userId = Number(req.params.user)
  const schema = z.object({
    role: z.enum(['member', 'developer', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent']),
  })
  const data = schema.parse(req.body)
  await assertTargetVisible(req, userId)
  if (data.role === 'developer' && !isDeveloper(req)) {
    throw new HttpError(403, 'You do not have permission to perform this action.')
  }
  const ok = await svc.assignRole(userId, data.role)
  if (!ok) throw new HttpError(400, 'Invalid role')
  await svc.recordAudit(getAdminId(req), 'role.assigned', 'user', userId, data, req.ip)
  res.json({ success: true })
}

export async function transactions(req: Request, res: Response) {
  const result = await svc.transactionsPage({
      q: String(req.query.q ?? ''),
      status: req.query.status ? String(req.query.status) : undefined,
      page: Number(req.query.page ?? 1),
      perPage: Number(req.query.perPage ?? 25),
    })
  res.json(result)
}

export async function storeTransaction(req: Request, res: Response) {
  const schema = z.object({
    member_code: z.string().min(1),
    type: z.string().min(1),
    gross_amount: z.coerce.number().positive(),
    eligible_amount: z.coerce.number().positive(),
    description: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const created = await svc.createTransaction({
    memberCode: data.member_code,
    type: data.type,
    grossAmount: data.gross_amount,
    eligibleAmount: data.eligible_amount,
    description: data.description,
  })
  if (!created) throw new HttpError(404, 'Member not found')
  await svc.recordAudit(getAdminId(req), 'transaction.created', 'business_transaction', created.id, data, req.ip)
  res.status(201).json(created)
}

export async function verifyTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ eligible_amount: z.coerce.number().positive().optional().nullable() }).partial()
  const data = schema.parse(req.body)
  const result = await svc.verifyTransaction(id, data.eligible_amount)
  if (!result) throw new HttpError(404, 'Transaction not found')
  await svc.recordAudit(getAdminId(req), 'transaction.verified', 'business_transaction', id, data, req.ip)
  res.json({ success: true })
}

export async function rejectTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  await svc.rejectTransaction(id)
  await svc.recordAudit(getAdminId(req), 'transaction.rejected', 'business_transaction', id, {}, req.ip)
  res.json({ success: true })
}

export async function reverseTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await svc.reverseTransaction(id)
  if (!result) throw new HttpError(404, 'Transaction not found')
  await svc.recordAudit(getAdminId(req), 'transaction.reversed', 'business_transaction', id, {}, req.ip)
  res.json({ success: true })
}

export async function ledger(req: Request, res: Response) {
  const result = await svc.ledgerEntries({
    q: String(req.query.q ?? ''),
    type: req.query.type ? String(req.query.type) : undefined,
  })
  res.json(result)
}

export async function deposits(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  res.json(await svc.depositsPage(status))
}

export async function verifyDeposit(req: Request, res: Response) {
  const id = Number(req.params.id)
  await svc.verifyDeposit(id)
  await svc.recordAudit(getAdminId(req), 'deposit.verified', 'deposit', id, {}, req.ip)
  res.json({ success: true })
}

export async function rejectDeposit(req: Request, res: Response) {
  const id = Number(req.params.id)
  await svc.rejectDeposit(id)
  await svc.recordAudit(getAdminId(req), 'deposit.rejected', 'deposit', id, {}, req.ip)
  res.json({ success: true })
}

export async function withdrawals(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  const rows = await svc.withdrawalsList(status)
  res.json(rows)
}

export async function resolveWithdrawal(req: Request, res: Response) {
  const schema = z.object({
    action: z.enum(['approve', 'reject', 'pay']),
    notes: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  const adminId = getAdminId(req)

  if (data.action === 'approve') {
    const result = await svc.approveWithdrawalRequest(id, adminId, data.notes ?? data.reason)
    if (!result) throw new HttpError(400, 'Unable to approve withdrawal')
  } else if (data.action === 'reject') {
    const result = await svc.rejectWithdrawalRequest(id, adminId, data.reason ?? data.notes)
    if (!result) throw new HttpError(400, 'Unable to reject withdrawal')
  } else if (data.action === 'pay') {
    const result = await svc.payWithdrawalRequest(id, adminId)
    if (!result) throw new HttpError(400, 'Unable to mark withdrawal as paid')
  }

  await svc.recordAudit(getAdminId(req), `withdrawal.${data.action}d`, 'withdrawal_request', id, data, req.ip)
  const updated = await findWithdrawal(id)
  res.json({ success: true, status: updated?.status ?? null })
}

export async function approveWithdrawalLegacy(req: Request, res: Response) {
  const schema = z.object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  if (data.action === 'approve') await approveWithdrawal(id, req.user!.id, data.notes)
  else await rejectWithdrawal(id, req.user!.id, data.notes)
  await dbAudit(req, `withdrawal.${data.action}d`, id, data)
  res.json(await dbPrepare(req, id))
}

async function dbAudit(req: Request, action: string, id: number, data: unknown) {
  await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    req.user!.id,
    action,
    'withdrawal_request',
    id,
    JSON.stringify(data),
  )
}

async function dbPrepare(req: Request, id: number) {
  return await db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id)
}

export async function reconciliation(_req: Request, res: Response) {
  res.json(await svc.reconciliationRecords())
}

export async function runReconciliation(req: Request, res: Response) {
  const result = await svc.runReconciliation()
  await svc.recordAudit(getAdminId(req), 'reconciliation.run', null, null, result, req.ip)
  res.json(result)
}

export async function plans(_req: Request, res: Response) {
  res.json(await svc.listPlans())
}

export async function storePlan(req: Request, res: Response) {
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
  const planId = await svc.createPlan(
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
  await svc.recordAudit(getAdminId(req), 'compensation_plan.created', 'compensation_plan', planId, data, req.ip)
  res.status(201).json({ id: planId })
}

export async function activatePlan(req: Request, res: Response) {
  const id = Number(req.params.id)
  await svc.activatePlan(id, getAdminId(req))
  await svc.recordAudit(getAdminId(req), 'compensation_plan.activated', 'compensation_plan', id, {}, req.ip)
  res.json({ success: true })
}

export async function planPreview(req: Request, res: Response) {
  const id = Number(req.params.id)
  const plan = await svc.planDetail(id)
  if (!plan) throw new HttpError(404, 'Plan not found')
  res.json(plan)
}

export async function commissions(req: Request, res: Response) {
  const result = await svc.commissionsPage({
      q: String(req.query.q ?? ''),
      status: req.query.status ? String(req.query.status) : undefined,
      page: Number(req.query.page ?? 1),
      perPage: Number(req.query.perPage ?? 25),
    })
  res.json(result)
}

export async function commissionPreview(req: Request, res: Response) {
  const reference = String(req.query.reference ?? '')
  const result = await svc.commissionPreview(reference)
  res.json(result)
}

export async function commissionExceptions(_req: Request, res: Response) {
  res.json(await svc.commissionExceptions())
}

export async function approveCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await svc.approveCommission(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to approve commission')
  await svc.recordAudit(getAdminId(req), 'commission.approved', 'commission', id, {}, req.ip)
  res.json(result)
}

export async function rejectCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ reason: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const result = await svc.rejectCommission(id, getAdminId(req), data.reason)
  if (!result) throw new HttpError(400, 'Unable to reject commission')
  await svc.recordAudit(getAdminId(req), 'commission.rejected', 'commission', id, data, req.ip)
  res.json(result)
}

export async function payCommission(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await svc.payCommission(id)
  if (!result) throw new HttpError(400, 'Unable to pay commission')
  await svc.recordAudit(getAdminId(req), 'commission.paid', 'commission', id, {}, req.ip)
  res.json(result)
}

export async function ranks(_req: Request, res: Response) {
  res.json(await svc.ranksAdmin())
}

export async function storeRank(req: Request, res: Response) {
  const schema = z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    level: z.coerce.number().int().min(1),
    salary: z.coerce.number().min(0),
    min_direct_links: z.coerce.number().int().min(0).default(0),
    downline_volume: z.coerce.number().min(0).default(0),
  })
  const data = schema.parse(req.body)
  const info = await db
    .prepare(
      `INSERT INTO ranks (code, name, level, salary, min_direct_links, downline_volume, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(data.code, data.name, data.level, data.salary, data.min_direct_links, data.downline_volume)
  await svc.recordAudit(getAdminId(req), 'rank.created', 'rank', Number(info.lastInsertRowid), data, req.ip)
  res.status(201).json(await db.prepare('SELECT * FROM ranks WHERE id = ?').get(Number(info.lastInsertRowid)))
}

export async function updateRank(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({
    monthly_salary: z.coerce.number().min(0).optional(),
    salary: z.coerce.number().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  const data = schema.parse(req.body)
  await svc.updateRank(id, data.monthly_salary ?? data.salary ?? 0, data.is_active ?? true)
  await svc.recordAudit(getAdminId(req), 'rank.updated', 'rank', id, data, req.ip)
  res.json({ success: true })
}

export async function recalculateRanks(req: Request, res: Response) {
  const period = String(req.query.period ?? new Date().toISOString().slice(0, 7))
  const result = await svc.recalculateRankReport(period)
  await svc.recordAudit(getAdminId(req), 'ranks.recalculated', null, null, result, req.ip)
  res.json(result)
}

export async function rankReports(req: Request, res: Response) {
  const period = String(req.query.period ?? new Date().toISOString().slice(0, 7))
  res.json(await svc.rankReport(period))
}

export async function recalculateRankReports(req: Request, res: Response) {
  const schema = z.object({ period: z.string().optional() })
  const data = schema.parse(req.body)
  const period = data.period ?? new Date().toISOString().slice(0, 7)
  const result = await svc.recalculateRankReport(period)
  await svc.recordAudit(getAdminId(req), 'rank_reports.recalculated', null, null, result, req.ip)
  res.json(result)
}

export async function salary(req: Request, res: Response) {
  const result = await svc.salaryPage({
    period: req.query.period ? String(req.query.period) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
  })
  res.json(result)
}

export async function generateSalary(req: Request, res: Response) {
  const schema = z.object({ period: z.string().optional() })
  const data = schema.parse(req.body)
  const period = data.period ?? new Date().toISOString().slice(0, 7)
  const result = await svc.generateSalary(period)
  await svc.recordAudit(getAdminId(req), 'salary.generated', null, null, result, req.ip)
  res.json(result)
}

export async function approveSalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await svc.approveSalary(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to approve salary')
  await svc.recordAudit(getAdminId(req), 'salary.approved', 'salary_payout', id, {}, req.ip)
  res.json(result)
}

export async function rejectSalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const schema = z.object({ reason: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const result = await svc.rejectSalary(id, getAdminId(req), data.reason)
  if (!result) throw new HttpError(400, 'Unable to reject salary')
  await svc.recordAudit(getAdminId(req), 'salary.rejected', 'salary_payout', id, data, req.ip)
  res.json(result)
}

export async function paySalary(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await svc.paySalary(id, getAdminId(req))
  if (!result) throw new HttpError(400, 'Unable to pay salary')
  await svc.recordAudit(getAdminId(req), 'salary.paid', 'salary_payout', id, {}, req.ip)
  res.json(result)
}

export async function rewards(_req: Request, res: Response) {
  res.json(await svc.rewardsAdmin())
}

export async function storeReward(req: Request, res: Response) {
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
    const id = await createReward({ title: data.name ?? data.title!, description: data.description ?? undefined, imagePath: data.image_path, cost: data.cost ?? data.threshold_amount ?? 0 })
    await svc.recordAudit(getAdminId(req), 'reward.created', 'reward', id, data, req.ip)
    res.status(201).json({ id })
    return
  }
  res.status(201).json({ success: true })
}

export async function updateReward(req: Request, res: Response) {
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
  const result = await svc.updateReward(id, {
      name: data.name ?? data.title,
      description: data.description,
      threshold_amount: data.threshold_amount ?? data.cost,
      budget: data.budget,
      max_claims: data.max_claims,
      required_rank_id: data.required_rank_id,
      is_active: data.is_active,
    })
  if (!result) throw new HttpError(404, 'Reward not found')
  await svc.recordAudit(getAdminId(req), 'reward.updated', 'reward', id, data, req.ip)
  res.json({ success: true })
}

export async function rewardClaims(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined
  res.json(await svc.rewardClaimsPage(status))
}

export async function resolveRewardClaim(req: Request, res: Response) {
  const schema = z.object({ action: z.enum(['approve', 'reject']), note: z.string().optional().nullable() })
  const data = schema.parse(req.body)
  const id = Number(req.params.id)
  if (data.action === 'approve') {
    const result = await svc.approveRewardClaim(id, getAdminId(req), data.note)
    if (!result) throw new HttpError(400, 'Unable to approve reward claim')
  } else {
    const result = await svc.rejectRewardClaim(id, getAdminId(req), data.note)
    if (!result) throw new HttpError(400, 'Unable to reject reward claim')
  }
  await svc.recordAudit(getAdminId(req), `reward_claim.${data.action}d`, 'reward_claim', id, data, req.ip)
  res.json({ success: true })
}

export async function announcements(_req: Request, res: Response) {
  res.json(await svc.announcementsList())
}

export async function storeAnnouncement(req: Request, res: Response) {
  const schema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    audience: z.string().min(1),
    severity: z.string().min(1),
    expires_at: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const id = await svc.createAnnouncement(data, getAdminId(req))
  await svc.recordAudit(getAdminId(req), 'announcement.created', 'announcement', id, data, req.ip)
  res.status(201).json({ id })
}

export async function publishAnnouncement(req: Request, res: Response) {
  const id = Number(req.params.id)
  await svc.publishAnnouncement(id)
  await svc.recordAudit(getAdminId(req), 'announcement.published', 'announcement', id, {}, req.ip)
  res.json({ success: true })
}

export async function auditLogs(req: Request, res: Response) {
  const result = await svc.auditLogsPage({
      q: String(req.query.q ?? ''),
      action: req.query.action ? String(req.query.action) : undefined,
      page: Number(req.query.page ?? 1),
      perPage: Number(req.query.perPage ?? 25),
    })
  res.json(result)
}

export async function jobs(req: Request, res: Response) {
  const result = await svc.jobRunsPage({
    job: req.query.job ? String(req.query.job) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
  })
  res.json(result)
}

export async function settings(req: Request, res: Response) {
  res.json(await svc.settingsOverview())
}

export async function updateSettings(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    await svc.updateSetting(key, String(value))
    invalidateSetting(key)
  }
  await svc.recordAudit(getAdminId(req), 'settings.updated', null, null, body, req.ip)
  res.json({ success: true })
}

export async function report(req: Request, res: Response) {
  let format = String(req.query.format ?? '').toLowerCase()
  const from = String(req.query.from ?? '1970-01-01')
  const to = String(req.query.to ?? '2100-01-01')
  if (!format && !req.path.includes('/reports/csv') && !req.path.includes('/reports/xlsx')) {
    res.json({ from, to, metrics: await svc.reportMetrics(from, to) })
    return
  }
  if (!format && req.path.includes('/reports/csv')) format = 'csv'
  else if (!format && req.path.includes('/reports/xlsx')) format = 'xlsx'
  else if (!format) format = 'xlsx'
  const rows = svc.reportExportRows(await svc.reportMetrics(from, to))
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

export async function reportLegacy(req: Request, res: Response) {
  // Keep compatibility with existing /admin/report
  return await report(req, res)
}

export async function network(req: Request, res: Response) {
  const memberCode = String(req.query.member_code ?? req.query.member ?? '')
  const depth = Number(req.query.depth ?? 3)
  if (!memberCode) throw new HttpError(400, 'member_code is required')
  const result = await svc.networkExplorer(memberCode, depth)
  if (!result) throw new HttpError(404, 'Member not found')
  res.json(result)
}

export async function recordPurchase(req: Request, res: Response) {
  const schema = z.object({
    member_id: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    reference: z.string().optional(),
  })
  const data = schema.parse(req.body)

  const member = await db.prepare('SELECT id FROM users WHERE id = ?').get(data.member_id)
  if (!member) throw new HttpError(404, 'Member not found')

  const reference = data.reference ?? `PUR-${Date.now()}-${data.member_id}`
  const existing = await db.prepare('SELECT id FROM business_transactions WHERE reference = ?').get(reference)
  if (existing) throw new HttpError(422, 'This reference has already been recorded')

  const info = await db
    .prepare(`INSERT INTO business_transactions (member_id, reference, gross_amount, eligible_amount, amount, type, status, created_at) VALUES (?, ?, ?, ?, ?, 'purchase', 'approved', datetime('now'))`)
    .run(data.member_id, reference, data.amount, data.amount, data.amount)
  const transactionId = Number(info.lastInsertRowid)

  const commissions = await generateCommissions(data.member_id, transactionId, data.amount)
  await svc.recordAudit(getAdminId(req), 'purchase.recorded', 'business_transaction', transactionId, data, req.ip)

  res.status(201).json({ transaction_id: transactionId, reference, commissions })
}

export async function runSalaryLegacy(_req: Request, res: Response) {
  const reference = new Date().toISOString().slice(0, 7)
  res.json(await runMonthlySalary(reference))
}

export async function ranksLegacy(_req: Request, res: Response) {
  res.json(await listRanks())
}

export async function recalculateRanksLegacy(req: Request, res: Response) {
  const members = await db.prepare(`SELECT id FROM users WHERE status = 'active'`).all() as { id: number }[]
  let promoted = 0
  for (const member of members) {
    const rank = await evaluateRank(member.id)
    if (rank) promoted += 1
  }
  res.json({ evaluated: members.length, ranked: promoted })
}
