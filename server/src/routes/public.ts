import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config/index.js'
import { findUserByCode } from '../models/user.js'
import { listRanksWithRequirements } from '../services/rank.js'
import { listTravelRewards } from '../services/reward.js'
import { clientIp, rateLimit } from '../middlewares/rateLimit.js'
import { db } from '../db/index.js'
import { getWithdrawalSettings } from '../services/settings.js'

const router = Router()

router.get('/config', async (_req, res) => {
  const plan = (await db
    .prepare('SELECT id, version, status FROM compensation_plans WHERE is_active = 1 ORDER BY version DESC LIMIT 1')
    .get()) as { id: number; version: number; status: string } | undefined

  const withdrawal = await getWithdrawalSettings()

  res.json({
    app_name: 'NEXORA',
    currency: config.currency,
    commission: {
      generation: config.commission.generation,
      rates: config.commission.rates,
      generation_rates: config.commission.generationRates,
    },
    plan: plan ?? null,
    withdrawal: { min: withdrawal.minAmount, max: withdrawal.maxAmount, hold_days: withdrawal.holdDays, enabled: withdrawal.enabled },
    registration: { sponsor_required: config.registration.sponsorRequired },
    ranks: await listRanksWithRequirements(),
    rewards: await listTravelRewards(true),
  })
})

router.get('/referral/:code', async (req, res) => {
  const code = z.string().min(3).max(32).parse(req.params.code)
  const sponsor = await findUserByCode(code)
  if (!sponsor) {
    res.status(404).json({ message: 'This referral code is not valid' })
    return
  }
  res.json({ member_code: sponsor.member_code, sponsor_name: sponsor.name })
})

// Laravel throttle:10,1 -> 10 requests per minute, keyed by IP.
router.post(
  '/contact',
  rateLimit({
    scope: 'public:contact',
    windowMs: config.rateLimit.contact.windowMs,
    max: config.rateLimit.contact.max,
    key: (req) => clientIp(req),
  }),
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      subject: z.string().min(3),
      message: z.string().min(10),
    })
    const data = schema.parse(req.body)

    await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, payload) VALUES (?, ?, ?, ?)').run(
      null,
      'contact.message',
      'contact',
      JSON.stringify(data),
    )

    res.status(201).json({ message: 'Thanks — our team will reach out shortly.' })
  },
)

export default router
