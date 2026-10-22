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
  network,
} from '../controllers/admin.js'
import { authenticate, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('super_admin', 'finance_admin', 'compliance_officer', 'support_agent'))

// Dashboard / summary
router.get('/summary', summary)
router.get('/report', reportLegacy)

// Network
router.get('/network', network)

// Members
router.get('/members', members)
router.get('/members/:id', memberShow)
router.put('/members/:id', updateMember)
router.patch('/members/:id', updateMember)
router.delete('/members/:id', deleteMember)
router.post('/members/:id/verify', memberVerify)
router.post('/members/:id/suspend', memberSuspend)
router.post('/members/:id/activate', memberActivate)
router.post('/members/:id/sponsor', memberSponsor)

// Verifications
router.get('/verifications', verifications)

// Roles
router.get('/roles', roles)
router.post('/roles/:user/assign', requireRole('super_admin'), assignRole)

// Transactions
router.get('/transactions', transactions)
router.post('/transactions', storeTransaction)
router.post('/transactions/:id/verify', verifyTransaction)
router.post('/transactions/:id/reject', rejectTransaction)
router.post('/transactions/:id/reverse', reverseTransaction)

// Ledger
router.get('/ledger', ledger)

// Deposits
router.get('/deposits', deposits)
router.post('/deposits/:id/verify', verifyDeposit)
router.post('/deposits/:id/reject', rejectDeposit)

// Withdrawals
router.get('/withdrawals', withdrawals)
router.post('/withdrawals/:id', resolveWithdrawal)

// Reconciliation
router.get('/reconciliation', reconciliation)
router.post('/reconciliation/run', runReconciliation)

// Compensation plans
router.get('/compensation-plans', plans)
router.get('/plans', plans)
router.post('/compensation-plans', storePlan)
router.post('/plans', storePlan)
router.post('/compensation-plans/:id/activate', activatePlan)
router.post('/plans/:id/activate', activatePlan)
router.get('/compensation-plans/:id/preview', planPreview)
router.get('/plans/:id/preview', planPreview)

// Commissions
router.get('/commissions', commissions)
router.get('/commissions/preview', commissionPreview)
router.get('/commissions/exceptions', commissionExceptions)
router.post('/commissions/:id/approve', approveCommission)
router.post('/commissions/:id/reject', rejectCommission)
router.post('/commissions/:id/pay', payCommission)

// Ranks
router.get('/ranks', ranks)
router.post('/ranks', requireRole('super_admin'), storeRank)
router.put('/ranks/:id', updateRank)
router.post('/ranks/:id', updateRank)
router.post('/ranks/recalculate', recalculateRanks)

// Rank reports
router.get('/rank-reports', rankReports)
router.post('/rank-reports/recalculate', recalculateRankReports)

// Salary
router.get('/salary', salary)
router.post('/salary/generate', requireRole('super_admin', 'finance_admin'), generateSalary)
router.post('/salary/run', requireRole('super_admin', 'finance_admin'), runSalaryLegacy)
router.post('/salary/:id/approve', approveSalary)
router.post('/salary/:id/reject', rejectSalary)
router.post('/salary/:id/pay', paySalary)

// Rewards
router.get('/rewards', rewards)
router.post('/rewards', storeReward)
router.put('/rewards/:id', updateReward)

// Reward claims
router.get('/reward-claims', rewardClaims)
router.post('/reward-claims/:id/approve', resolveRewardClaim)
router.post('/reward-claims/:id/reject', resolveRewardClaim)

// Announcements
router.get('/announcements', announcements)
router.post('/announcements', storeAnnouncement)
router.post('/announcements/:id/publish', publishAnnouncement)

// Audit logs
router.get('/audit-logs', auditLogs)

// Jobs
router.get('/jobs', jobs)

// Settings
router.get('/settings', settings)
router.put('/settings', updateSettings)

// Legacy / other routes
router.get('/ranks-legacy', ranksLegacy)
router.post('/ranks/recalculate-legacy', recalculateRanksLegacy)
router.post('/purchases', recordPurchase)

// Reports (export)
router.get('/reports', report)
router.get('/reports/export', report)

// Keep compatibility
router.post('/withdrawals/:id/resolve', approveWithdrawalLegacy)

export default router
