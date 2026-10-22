import { Router } from 'express'
import { login, me, register } from '../controllers/auth.js'
import { authenticate } from '../middlewares/auth.js'
import { clientIp, rateLimit } from '../middlewares/rateLimit.js'
import { config } from '../config/index.js'

const router = Router()

// Laravel throttle:registration -> 10 requests per hour, keyed by IP.
router.post(
  '/register',
  rateLimit({
    scope: 'auth:register',
    windowMs: config.rateLimit.registration.windowMs,
    max: config.rateLimit.registration.max,
    key: (req) => clientIp(req),
  }),
  register,
)

// Laravel throttle:login -> 5 requests per minute, keyed by email and IP.
router.post(
  '/login',
  rateLimit({
    scope: 'auth:login',
    windowMs: config.rateLimit.login.windowMs,
    max: config.rateLimit.login.max,
    key: (req) => `${String(req.body?.email ?? '').toLowerCase()}|${clientIp(req)}`,
  }),
  login,
)

router.get('/me', authenticate, me)

export default router
