import { Router } from 'express'
import {
  members,
  recalculateRanks,
  recordPurchase,
  report,
  resolveRewardClaim,
  resolveWithdrawal,
  rewards,
  runSalary,
  storeRank,
  storeReward,
  summary,
  updateMember,
  withdrawals,
  ranks,
} from '../controllers/admin.js'
import { authenticate, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('super_admin', 'finance_admin', 'compliance_officer', 'support_agent'))

router.get('/summary', summary)
router.get('/members', members)
router.patch('/members/:id', updateMember)
router.get('/withdrawals', withdrawals)
router.post('/withdrawals/:id', resolveWithdrawal)
router.get('/rewards', rewards)
router.post('/rewards', storeReward)
router.post('/reward-claims/:id', resolveRewardClaim)
router.get('/ranks', ranks)
router.post('/ranks', requireRole('super_admin'), storeRank)
router.post('/ranks/recalculate', recalculateRanks)
router.post('/purchases', recordPurchase)
router.post('/salary/run', requireRole('super_admin', 'finance_admin'), runSalary)
router.get('/report', report)

export default router
