import { Router } from 'express'
import {
  emailVerificationStatus,
  forgotPassword,
  login,
  me,
  register,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
} from '../controllers/auth.js'
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

// Laravel throttle:sensitive -> the password reset flow shares the limiter
// with the other sensitive member routes (10 requests per minute).
const sensitive = rateLimit({
  scope: 'sensitive',
  windowMs: config.rateLimit.sensitive.windowMs,
  max: config.rateLimit.sensitive.max,
  key: (req) => `${req.body?.email ? String(req.body.email).toLowerCase() : 'guest'}|${clientIp(req)}`,
})

router.post('/forgot-password', sensitive, forgotPassword)
router.post('/reset-password', sensitive, resetPassword)

router.get('/email/verification', authenticate, emailVerificationStatus)
router.post('/email/verification-notification', sensitive, sendEmailVerification)
router.get('/email/verify', verifyEmail)

export default router
