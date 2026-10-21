import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config/index.js'
import { findUserByCode } from '../models/user.js'
import { listRanks } from '../services/rank.js'
import { listRewards } from '../services/reward.js'
import { db } from '../db/index.js'

const router = Router()

router.get('/config', (_req, res) => {
  res.json({
    app_name: 'NEXORA',
    currency: config.currency,
    commission: { generation: config.commission.generation, rates: config.commission.rates },
    withdrawal: { min: config.withdrawal.minAmount, max: config.withdrawal.maxAmount, hold_days: config.withdrawal.holdDays },
    registration: { sponsor_required: config.registration.sponsorRequired },
    ranks: listRanks(),
    rewards: listRewards(true),
  })
})

router.get('/referral/:code', (req, res) => {
  const code = z.string().min(3).max(32).parse(req.params.code)
  const sponsor = findUserByCode(code)
  if (!sponsor) {
    res.status(404).json({ message: 'This referral code is not valid' })
    return
  }
  res.json({ member_code: sponsor.member_code, sponsor_name: sponsor.name })
})

router.post('/contact', (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    subject: z.string().min(3),
    message: z.string().min(10),
  })
  const data = schema.parse(req.body)

  db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, payload) VALUES (?, ?, ?, ?)').run(
    null,
    'contact.message',
    'contact',
    JSON.stringify(data),
  )

  res.status(201).json({ message: 'Thanks — our team will reach out shortly.' })
})

export default router
