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
} from '../controllers/member.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

router.get('/summary', summary)
router.get('/referrals', referrals)
router.get('/network', network)
router.get('/commissions', commissions)
router.get('/ledger', ledger)
router.get('/withdrawals', withdrawals)
router.post('/withdrawals', storeWithdrawal)
router.get('/rewards', rewards)
router.post('/rewards/claim', storeRewardClaim)
router.get('/rank', rank)
router.get('/profile', profile)
router.put('/profile', updateProfile)

export default router
