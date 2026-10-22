import { Router } from 'express'
import {
  commissions,
  ledger,
  network,
  profile,
  rank,
  referrals,
  rewards,
  summary,
  updateProfile,
  withdrawals,
  storeWithdrawal,
  storeRewardClaim,
  rankProgress,
  team,
  teamShow,
  salary,
  wallet,
  deposits,
  storeDeposit,
  transactions,
  notifications,
  notificationUnreadCount,
  announcements,
  readAllNotifications,
  security,
  updateSecurityPassword,
  verification,
  storeVerification,
  claimRewardById,
} from '../controllers/member.js'
import { authenticate } from '../middlewares/auth.js'
import { asyncHandler } from '../middlewares/error.js'
import { clientIp, rateLimit } from '../middlewares/rateLimit.js'
import { config } from '../config/index.js'

const router = Router()

router.use(authenticate)

// Laravel throttle:sensitive -> 10 requests per minute, keyed by user and IP.
// The Laravel "sensitive" throttle is one named limiter shared by the member
// and admin routes; the key carries the user id so the buckets never clash.
const sensitive = rateLimit({
  scope: 'sensitive',
  windowMs: config.rateLimit.sensitive.windowMs,
  max: config.rateLimit.sensitive.max,
  key: (req) => `${req.user?.id ?? 'guest'}|${clientIp(req)}`,
})

router.get('/summary', summary)
router.get('/profile', profile)
router.put('/profile', updateProfile)
router.get('/verification', verification)
router.post('/verification', asyncHandler(storeVerification))
router.get('/referrals', referrals)
router.get('/team', team)
router.get('/team/:member', teamShow)
router.get('/commissions', commissions)
router.get('/rank-progress', rankProgress)
router.get('/salary', salary)
router.get('/rewards', rewards)
router.post('/rewards/:id/claim', sensitive, claimRewardById)
router.get('/wallet', wallet)
router.get('/deposits', deposits)
router.post('/deposits', sensitive, storeDeposit)
router.get('/withdrawals', withdrawals)
router.post('/withdrawals', sensitive, storeWithdrawal)
router.get('/transactions', transactions)
router.get('/notifications', notifications)
router.get('/notifications/unread-count', notificationUnreadCount)
router.post('/notifications/read-all', sensitive, readAllNotifications)
router.get('/announcements', announcements)
router.get('/security', security)
router.put('/security/password', sensitive, updateSecurityPassword)

router.get('/network', network)
router.get('/ledger', ledger)
router.post('/rewards/claim', sensitive, storeRewardClaim)
router.get('/rank', rank)

export default router
