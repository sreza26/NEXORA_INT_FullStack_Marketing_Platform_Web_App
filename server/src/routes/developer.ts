import { Router } from 'express'
import {
  activity,
  demoData,
  overview,
  purgeDemoData,
  userDetail,
  users,
} from '../controllers/developer.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { clientIp, rateLimit } from '../middlewares/rateLimit.js'
import { config } from '../config/index.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('developer'))

const sensitive = rateLimit({
  scope: 'sensitive',
  windowMs: config.rateLimit.sensitive.windowMs,
  max: config.rateLimit.sensitive.max,
  key: (req) => `${req.user?.id ?? 'guest'}|${clientIp(req)}`,
})

router.get('/overview', overview)
router.get('/users', users)
router.get('/users/:id', userDetail)
router.get('/activity', activity)
router.get('/demo-data', demoData)
router.delete('/demo-data', sensitive, purgeDemoData)
router.post('/demo-data/purge', sensitive, purgeDemoData)

export default router
