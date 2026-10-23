import { Router } from 'express'
import {
  members,
  memberShow,
  updateMember,
  deleteMember,
  memberVerify,
  memberSuspend,
  memberActivate,
  memberSponsor,
  recalculateRanks,
  recalculateRanksLegacy,
  recordPurchase,
  report,
  reportLegacy,
  resolveRewardClaim,
  resolveWithdrawal,
  approveWithdrawalLegacy,
  rewards,
  generateSalary as runSalary,
  runSalaryLegacy,
  storeRank,
  storeReward,
  summary,
  withdrawals,
  ranks,
  ranksLegacy,
  verifications,
  roles,
  assignRole,
  transactions,
  storeTransaction,
  verifyTransaction,
  rejectTransaction,
  reverseTransaction,
  ledger,
  deposits,
  verifyDeposit,
  rejectDeposit,
  reconciliation,
  runReconciliation,
  plans,
  storePlan,
  activatePlan,
  planPreview,
  commissions,
  commissionPreview,
  commissionExceptions,
  approveCommission,
  rejectCommission,
  payCommission,
  updateRank,
  rankReports,
  recalculateRankReports,
  salary,
  generateSalary,
  approveSalary,
  rejectSalary,
  paySalary,
  updateReward,
  rewardClaims,
  announcements,
  storeAnnouncement,
  publishAnnouncement,
  auditLogs,
  jobs,
  settings,
  updateSettings,
  demoDataStatus,
  purgeDemoData,
  network,
} from '../controllers/admin.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { requirePermission, requireResolvedPermission } from '../middlewares/permissions.js'
import { clientIp, rateLimit } from '../middlewares/rateLimit.js'
import { config } from '../config/index.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('developer', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'))

// Laravel throttle:sensitive -> 10 requests per minute, keyed by user and IP.
// The Laravel "sensitive" throttle is one named limiter shared by the member
// and admin routes; the key carries the user id so the buckets never clash.
const sensitive = rateLimit({
  scope: 'sensitive',
  windowMs: config.rateLimit.sensitive.windowMs,
  max: config.rateLimit.sensitive.max,
  key: (req) => `${req.user?.id ?? 'guest'}|${clientIp(req)}`,
})

/**
 * The permission attached to each admin route mirrors the
 * `permission:...` middleware of the Laravel reference routes.
 */

// Dashboard / summary
router.get('/summary', summary)
router.get('/report', requirePermission('reports.export'), reportLegacy)

// Network
router.get('/network', requirePermission('members.view'), network)

// Members
router.get('/members', requirePermission('members.view'), members)
router.get('/members/:id', requirePermission('members.view'), memberShow)
router.put('/members/:id', requirePermission('members.manage'), updateMember)
router.patch('/members/:id', requirePermission('members.manage'), updateMember)
router.delete('/members/:id', requirePermission('members.manage'), deleteMember)
router.post('/members/:id/verify', sensitive, requirePermission('members.verify_identity'), memberVerify)
router.post('/members/:id/suspend', sensitive, requirePermission('members.suspend'), memberSuspend)
router.post('/members/:id/activate', sensitive, requirePermission('members.suspend'), memberActivate)
router.post('/members/:id/sponsor', sensitive, requirePermission('members.change_sponsor'), memberSponsor)

// Verifications
router.get('/verifications', requirePermission('members.verify_identity'), verifications)

// Roles
router.get('/roles', requirePermission('roles.manage'), roles)
router.post('/roles/:user/assign', sensitive, requirePermission('roles.manage'), requireRole('developer', 'super_admin'), assignRole)

// Transactions
router.get('/transactions', requirePermission('transactions.view'), transactions)
router.post('/transactions', sensitive, requirePermission('transactions.create'), storeTransaction)
router.post('/transactions/:id/verify', sensitive, requirePermission('transactions.verify'), verifyTransaction)
router.post('/transactions/:id/reject', sensitive, requirePermission('transactions.verify'), rejectTransaction)
router.post('/transactions/:id/reverse', sensitive, requirePermission('transactions.reverse'), reverseTransaction)

// Ledger
router.get('/ledger', requirePermission('ledger.view'), ledger)

// Deposits
router.get('/deposits', requirePermission('deposits.view'), deposits)
router.post('/deposits/:id/verify', sensitive, requirePermission('deposits.verify'), verifyDeposit)
router.post('/deposits/:id/reject', sensitive, requirePermission('deposits.verify'), rejectDeposit)

// Withdrawals
router.get('/withdrawals', requirePermission('withdrawals.view'), withdrawals)
router.post(
  '/withdrawals/:id',
  sensitive,
  requireResolvedPermission((req) => {
    const action = String((req.body as { action?: string } | undefined)?.action ?? '').toLowerCase()
    if (action === 'pay') return 'withdrawals.pay'
    if (action === 'approve' || action === 'reject') return 'withdrawals.approve'
    return null
  }),
  resolveWithdrawal,
)
router.post('/withdrawals/:id/resolve', sensitive, requirePermission('withdrawals.approve'), approveWithdrawalLegacy)

// Reconciliation
router.get('/reconciliation', requirePermission('reconciliation.view'), reconciliation)
router.post('/reconciliation/run', sensitive, requirePermission('reconciliation.run'), runReconciliation)

// Compensation plans
router.get('/compensation-plans', requirePermission('plans.manage'), plans)
router.get('/plans', requirePermission('plans.manage'), plans)
router.post('/compensation-plans', sensitive, requirePermission('plans.manage'), storePlan)
router.post('/plans', sensitive, requirePermission('plans.manage'), storePlan)
router.post('/compensation-plans/:id/activate', sensitive, requirePermission('plans.approve'), activatePlan)
router.post('/plans/:id/activate', sensitive, requirePermission('plans.approve'), activatePlan)
router.get('/compensation-plans/:id/preview', requirePermission('plans.manage'), planPreview)
router.get('/plans/:id/preview', requirePermission('plans.manage'), planPreview)

// Commissions
router.get('/commissions', requirePermission('commissions.view'), commissions)
router.get('/commissions/preview', requirePermission('commissions.view'), commissionPreview)
router.get('/commissions/exceptions', requirePermission('commissions.view'), commissionExceptions)
router.post('/commissions/:id/approve', sensitive, requirePermission('commissions.approve'), approveCommission)
router.post('/commissions/:id/reject', sensitive, requirePermission('commissions.approve'), rejectCommission)
router.post('/commissions/:id/pay', sensitive, requirePermission('commissions.pay'), payCommission)

// Ranks
router.get('/ranks', requirePermission('ranks.manage'), ranks)
router.post('/ranks', sensitive, requirePermission('ranks.manage'), storeRank)
router.post('/ranks/recalculate', sensitive, requirePermission('ranks.manage'), recalculateRanks)
router.post('/ranks/recalculate-legacy', sensitive, requirePermission('ranks.manage'), recalculateRanksLegacy)
router.put('/ranks/:id', sensitive, requirePermission('ranks.manage'), updateRank)
router.post('/ranks/:id', sensitive, requirePermission('ranks.manage'), updateRank)

// Rank reports
router.get('/rank-reports', requirePermission('ranks.view'), rankReports)
router.post('/rank-reports/recalculate', sensitive, requirePermission('ranks.manage'), recalculateRankReports)

// Salary
router.get('/salary', requirePermission('salary.view'), salary)
router.post('/salary/generate', sensitive, requirePermission('salary.approve'), generateSalary)
router.post('/salary/run', sensitive, requirePermission('salary.approve'), runSalaryLegacy)
router.post('/salary/:id/approve', sensitive, requirePermission('salary.approve'), approveSalary)
router.post('/salary/:id/reject', sensitive, requirePermission('salary.approve'), rejectSalary)
router.post('/salary/:id/pay', sensitive, requirePermission('salary.pay'), paySalary)

// Rewards
router.get('/rewards', requirePermission('rewards.manage'), rewards)
router.post('/rewards', sensitive, requirePermission('rewards.manage'), storeReward)
router.put('/rewards/:id', sensitive, requirePermission('rewards.manage'), updateReward)

// Reward claims
router.get('/reward-claims', requirePermission('rewards.claims.review'), rewardClaims)
router.post('/reward-claims/:id/approve', sensitive, requirePermission('rewards.claims.review'), resolveRewardClaim)
router.post('/reward-claims/:id/reject', sensitive, requirePermission('rewards.claims.review'), resolveRewardClaim)

// Announcements
router.get('/announcements', requirePermission('announcements.manage'), announcements)
router.post('/announcements', sensitive, requirePermission('announcements.manage'), storeAnnouncement)
router.post('/announcements/:id/publish', sensitive, requirePermission('announcements.manage'), publishAnnouncement)

// Audit logs
router.get('/audit-logs', requirePermission('audit.view'), auditLogs)

// Jobs
router.get('/jobs', requirePermission('jobs.view'), jobs)

// Settings
router.get('/settings', requirePermission('settings.manage'), settings)
router.put('/settings', sensitive, requirePermission('settings.manage'), updateSettings)

// Demo data maintenance
router.get('/demo-data', requirePermission('settings.manage'), demoDataStatus)
router.delete('/demo-data', sensitive, requirePermission('settings.manage'), purgeDemoData)

// Legacy / other routes
router.get('/ranks-legacy', requirePermission('ranks.manage'), ranksLegacy)
router.post('/purchases', sensitive, requirePermission('transactions.create'), recordPurchase)

// Reports (export)
router.get('/reports', requirePermission('reports.view'), report)
router.get('/reports/export', requirePermission('reports.export'), report)
router.get('/reports/xlsx', requirePermission('reports.export'), report)
router.get('/reports/csv', requirePermission('reports.export'), report)

export default router
