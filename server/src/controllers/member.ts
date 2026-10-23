import type { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { HttpError } from '../middlewares/error.js'
import { parseMultipart } from '../middlewares/upload.js'
import {
  deleteStoredFile,
  MAX_UPLOAD_BYTES,
  SELFIE_MIME_TYPES,
  storeVerificationDocument,
  VERIFICATION_MIME_TYPES,
} from '../utils/storage.js'
import { listLedger, walletBalance } from '../models/ledger.js'
import { listCommissions, totalCommissionFor } from '../services/commission.js'
import { directReferrals, downlineCounts, teamVolume, totalNetworkSize } from '../services/tree.js'
import { listWithdrawals, createWithdrawal } from '../services/withdrawal.js'
import { listRewards, claimReward, listClaims } from '../services/reward.js'
import { achievements, evaluateRank, rankOf } from '../services/rank.js'
import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { nowIso } from '../db/index.js'

export async function summary(req: Request, res: Response) {
  const memberId = req.user!.id
  const user = await db.prepare('SELECT id, name, email, member_code, status, verification_status FROM users WHERE id = ?').get(memberId)

  res.json({
    user,
    wallet: { balance: await walletBalance(memberId), currency: config.currency },
    direct_referrals: (await directReferrals(memberId)).length,
    total_network: await totalNetworkSize(memberId),
    team_volume: await teamVolume(memberId),
    rank: await rankOf(memberId),
    pending_withdrawals: (
      (await db.prepare(`SELECT COUNT(*) AS c FROM withdrawal_requests WHERE member_id = ? AND status = 'pending'`).get(memberId)) as {
        c: number
      }
    ).c,
    commission_total: await totalCommissionFor(memberId),
    levels: await downlineCounts(memberId),
  })
}

export async function referrals(req: Request, res: Response) {
  res.json(await directReferrals(req.user!.id))
}

export async function network(req: Request, res: Response) {
  const memberId = req.user!.id
  res.json({
    levels: await downlineCounts(memberId),
    total: await totalNetworkSize(memberId),
    volume: await teamVolume(memberId),
    referral_link: `${config.appUrl}/r/${req.user!.member_code}`,
  })
}

export async function commissions(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 100)
  const offset = Number(req.query.offset ?? 0)
  res.json({
    total: await totalCommissionFor(req.user!.id),
    items: await listCommissions(req.user!.id, limit, offset),
  })
}

export async function ledger(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 100)
  const offset = Number(req.query.offset ?? 0)
  res.json({
    balance: await walletBalance(req.user!.id),
    items: await listLedger(req.user!.id, limit, offset),
  })
}

export async function withdrawals(req: Request, res: Response) {
  res.json(await listWithdrawals(req.user!.id))
}

export async function storeWithdrawal(req: Request, res: Response) {
  const schema = z.object({
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    method: z.enum(['bank', 'mobile', 'crypto']),
    account_details: z.string().min(4, 'Account details are required'),
  })
  const data = schema.parse(req.body)

  const result = await createWithdrawal({
      memberId: req.user!.id,
      amount: data.amount,
      method: data.method,
      accountDetails: data.account_details,
    })

  res.status(201).json({ id: result.id, balance: result.balance })
}

export async function rewards(req: Request, res: Response) {
  res.json({ rewards: await listRewards(true), claims: await listClaims(req.user!.id) })
}

export async function storeRewardClaim(req: Request, res: Response) {
  const schema = z.object({ reward_id: z.coerce.number().int().positive() })
  const data = schema.parse(req.body)
  const claimId = await claimReward(req.user!.id, data.reward_id)
  res.status(201).json({ id: claimId })
}

export async function rank(req: Request, res: Response) {
  const memberId = req.user!.id
  const evaluated = await evaluateRank(memberId)
  res.json({ rank: await rankOf(memberId), evaluated, achievements: await achievements(memberId) })
}

export async function profile(req: Request, res: Response) {
  const memberId = req.user!.id
  const row = await db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(memberId) as any
  if (!row) throw new HttpError(404, 'Profile not found')
  res.json(row)
}

export async function updateProfile(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    address_line: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    emergency_contact: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const memberId = req.user!.id

  if (data.name) {
    await db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(data.name, memberId)
  }
  if (data.phone !== undefined) {
    await db.prepare("UPDATE users SET phone = ?, updated_at = datetime('now') WHERE id = ?").run(data.phone ?? null, memberId)
  }

  await db.prepare(
    `INSERT INTO member_profiles (member_id, full_name, address, address_line, city, country, postal_code, emergency_contact, updated_at)
     VALUES (?, COALESCE(?, (SELECT name FROM users WHERE id = ?)), COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?), datetime('now'))
     ON CONFLICT(member_id) DO UPDATE SET
       full_name = COALESCE(excluded.full_name, member_profiles.full_name),
       address = COALESCE(excluded.address, member_profiles.address),
       address_line = COALESCE(excluded.address_line, member_profiles.address_line),
       city = COALESCE(excluded.city, member_profiles.city),
       country = COALESCE(excluded.country, member_profiles.country),
       postal_code = COALESCE(excluded.postal_code, member_profiles.postal_code),
       emergency_contact = COALESCE(excluded.emergency_contact, member_profiles.emergency_contact),
       updated_at = datetime('now')`,
  ).run(
    memberId,
    data.name ?? null,
    memberId,
    data.address ?? null,
    data.address_line ?? null,
    data.city ?? null,
    data.city ?? null,
    data.country ?? null,
    data.country ?? null,
    data.postal_code ?? null,
    data.postal_code ?? null,
    data.emergency_contact ?? null,
    data.emergency_contact ?? null,
  )

  res.json({ status: 'ok' })
}

export async function rankProgress(req: Request, res: Response) {
  const memberId = req.user!.id
  const evaluated = await evaluateRank(memberId)
  const ranks = await db.prepare('SELECT * FROM ranks ORDER BY level ASC').all()
  const achievements = await db.prepare('SELECT ra.*, r.name as rank_name FROM rank_achievements ra LEFT JOIN ranks r ON r.id = ra.rank_id WHERE ra.member_id = ? ORDER BY ra.achieved_at DESC').all(memberId)
  const user = await db.prepare('SELECT id, current_rank_id FROM users WHERE id = ?').get(memberId) as any
  const current = user?.current_rank_id ? await db.prepare('SELECT * FROM ranks WHERE id = ?').get(user.current_rank_id) : null
  const next = await db.prepare('SELECT * FROM ranks WHERE level > ? ORDER BY level ASC LIMIT 1').get((current as any)?.level ?? 0) as any

  const requirements = []
  if (next) {
    const reqs = await db.prepare('SELECT * FROM rank_requirements WHERE rank_id = ? ORDER BY sort_order ASC').all((next as any).id) as any[]
    for (const r of reqs) {
      let actual = 0
      if (r.type === 'min_direct_links') actual = (await directReferrals(memberId)).length
      if (r.type === 'downline_volume') actual = await teamVolume(memberId)
      if (r.type === 'has_direct_sponsor') {
        const s = await db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(memberId) as any
        actual = s?.sponsor_id ? 1 : 0
      }
      const required = Number(r.value ?? 0)
      requirements.push({
        type: r.type,
        label: r.label,
        required,
        actual,
        satisfied: r.type === 'has_direct_sponsor' ? actual >= 1 : actual >= required,
      })
    }
  }

  res.json({
    progress: { current, next, requirements },
    metrics: {
      direct_links_count: (await directReferrals(memberId)).length,
      has_direct_sponsor: !!(await db.prepare('SELECT sponsor_id FROM users WHERE id = ?').get(memberId) as any)?.sponsor_id,
      downline_volume_lifetime: await teamVolume(memberId),
      downline_volume_period: await teamVolume(memberId),
      downline_members: await totalNetworkSize(memberId),
      max_downline_depth: Number((await db.prepare('SELECT MAX(depth) as d FROM referral_closures WHERE ancestor_id = ?').get(memberId) as any)?.d ?? 0),
    },
    ranks,
    achievements,
  })
}

export async function team(req: Request, res: Response) {
  const memberId = req.user!.id
  const generation = req.query.generation ? Number(req.query.generation) : null
  const q = (req.query.q as string | undefined)?.trim().toLowerCase()

  let members: any[] = []
  if (generation && generation > 1) {
    const ids = await db.prepare('SELECT descendant_id FROM referral_closures WHERE ancestor_id = ? AND depth = ?').all(memberId, generation - 1) as any[]
    const idList = ids.map((i) => i.descendant_id)
    if (idList.length) {
      const placeholders = idList.map(() => '?').join(',')
      members = await db.prepare(`SELECT * FROM users WHERE id IN (${placeholders}) ORDER BY registered_at ASC`).all(...idList)
    }
  } else {
    members = await db.prepare('SELECT * FROM users WHERE sponsor_id = ? ORDER BY registered_at ASC').all(memberId)
  }

  if (q) {
    members = members.filter((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.member_code?.toLowerCase().includes(q))
  }

  const enriched = await Promise.all(
    members.map(async (m) => {
      const rank = m.current_rank_id ? await db.prepare('SELECT * FROM ranks WHERE id = ?').get(m.current_rank_id) : null
      return { ...m, currentRank: rank }
    }),
  )

  const genCounts: Record<number, number> = {}
  for (let g = 1; g <= 6; g++) {
    if (g === 1) genCounts[g] = (await directReferrals(memberId)).length
    else genCounts[g] = Number((await db.prepare('SELECT COUNT(*) as c FROM referral_closures WHERE ancestor_id = ? AND depth = ?').get(memberId, g - 1) as any)?.c ?? 0)
  }

  res.json({ members: enriched, generationCounts: genCounts })
}

export async function teamShow(req: Request, res: Response) {
  const memberId = req.user!.id
  const targetId = Number(req.params.member)
  const member = await db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any
  if (!member) throw new HttpError(404, 'Member not found')

  const depth = (await db.prepare('SELECT depth FROM referral_closures WHERE ancestor_id = ? AND descendant_id = ?').get(memberId, targetId) as any)?.depth ?? null
  const sponsor = member.sponsor_id ? await db.prepare('SELECT * FROM users WHERE id = ?').get(member.sponsor_id) : null
  const rank = member.current_rank_id ? await db.prepare('SELECT * FROM ranks WHERE id = ?').get(member.current_rank_id) : null
  const directReferralsList = await Promise.all(
    (await directReferrals(targetId)).map(async (r: any) => ({
      ...r,
      currentRank: r.current_rank_id ? await db.prepare('SELECT * FROM ranks WHERE id = ?').get(r.current_rank_id) : null,
    })),
  )

  res.json({ member: { ...member, sponsor, currentRank: rank }, directReferrals: directReferralsList, depth })
}

export async function salary(req: Request, res: Response) {
  const memberId = req.user!.id
  const payouts = await db.prepare('SELECT * FROM salary_payouts WHERE member_id = ? ORDER BY id DESC').all(memberId) as any[]
  const rank = await db.prepare('SELECT r.* FROM users u LEFT JOIN ranks r ON r.id = u.current_rank_id WHERE u.id = ?').get(memberId)
  res.json({ payouts, rank })
}

export async function wallet(req: Request, res: Response) {
  const memberId = req.user!.id
  const account = await db.prepare('SELECT * FROM wallet_accounts WHERE member_id = ?').get(memberId) as any
  const entries = await listLedger(memberId, 100, 0)
  res.json({ account: account || { balance: 0, pending_balance: 0, lifetime_credited: 0, lifetime_debited: 0, currency: 'USD' }, entries })
}

export async function deposits(req: Request, res: Response) {
  const memberId = req.user!.id
  const deposits = await db.prepare('SELECT * FROM deposits WHERE member_id = ? ORDER BY created_at DESC').all(memberId)
  res.json({ deposits, policyEnabled: true, holdDays: 30 })
}

export async function storeDeposit(req: Request, res: Response) {
  const schema = z.object({
    amount: z.coerce.number().positive(),
    method: z.string().min(1),
    reference: z.string().optional().nullable(),
  })
  const data = schema.parse(req.body)
  const memberId = req.user!.id
  const ref = data.reference || `DEP-${Date.now()}`
  await db.prepare('INSERT INTO deposits (member_id, reference, amount, currency, method, status, hold_until, submitted_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,datetime("now"),datetime("now"))')
    .run(memberId, ref, data.amount, 'USD', data.method, 'pending', new Date(Date.now() + 30*86400000).toISOString().slice(0,10), nowIso())
  res.status(201).json({ status: 'ok' })
}

export async function transactions(req: Request, res: Response) {
  const memberId = req.user!.id
  const status = req.query.status as string | undefined
  let query = 'SELECT * FROM business_transactions WHERE member_id = ?'
  const params: any[] = [memberId]
  if (status) { query += ' AND status = ?'; params.push(status) }
  query += ' ORDER BY created_at DESC'
  const transactions = await db.prepare(query).all(...params)
  res.json({ transactions })
}

export async function notifications(req: Request, res: Response) {
  const memberId = req.user!.id
  const notifications = await db.prepare('SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC').all(memberId)
  res.json({ notifications })
}

/**
 * Unread counter behind the member header bell.
 *
 * The Laravel layout reads `auth()->user()->unreadNotifications_count`; the
 * React client polls this lightweight endpoint instead of loading the whole
 * notification list on every page.
 */
export async function notificationUnreadCount(req: Request, res: Response) {
  const memberId = req.user!.id
  const row = (await db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE member_id = ? AND read_at IS NULL')
    .get(memberId)) as { c: number }
  res.json({ count: row.c })
}

/**
 * Published announcements shown in the member portal banner.
 *
 * Mirrors the Laravel view composer, which shares the five most recent
 * published announcements with the member layout.
 */
export async function announcements(_req: Request, res: Response) {
  const rows = await db
    .prepare(
      `SELECT id, title, body, severity, published_at
       FROM announcements
       WHERE is_published = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY published_at DESC, id DESC
       LIMIT 5`,
    )
    .all()
  res.json({ announcements: rows })
}

export async function readAllNotifications(req: Request, res: Response) {
  const memberId = req.user!.id
  await db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE member_id = ? AND read_at IS NULL").run(memberId)
  res.json({ status: 'ok' })
}

export function security(req: Request, res: Response) {
  res.json({ ok: true })
}

export async function updateSecurityPassword(req: Request, res: Response) {
  const schema = z.object({
    current_password: z.string().min(1),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
  })
  const data = schema.parse(req.body)
  if (data.password !== data.password_confirmation) throw new HttpError(422, 'Password confirmation does not match')
  const memberId = req.user!.id
  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(memberId) as any
  if (!user || !bcrypt.compareSync(data.current_password, user.password_hash)) throw new HttpError(422, 'Current password is incorrect')
  await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(bcrypt.hashSync(data.password, 10), memberId)
  res.json({ status: 'ok' })
}

export async function verification(req: Request, res: Response) {
  const memberId = req.user!.id
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(memberId) as any
  const profile = await db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(memberId)
  res.json({ user: { ...user, profile }, profile })
}

export async function storeVerification(req: Request, res: Response) {
  const memberId = req.user!.id
  const current = await db.prepare('SELECT verification_status FROM users WHERE id = ?').get(memberId) as
    | { verification_status: string }
    | undefined

  if (current?.verification_status === 'pending') {
    throw new HttpError(422, 'Your documents are already under review.')
  }

  const form = await parseMultipart(req, { maxFileBytes: MAX_UPLOAD_BYTES })

  const schema = z.object({
    full_name: z.string().min(1, 'Full name is required').max(120),
    nid_number: z.string().min(1, 'NID or passport number is required').max(60),
    country: z.string().min(1, 'Country is required').max(80),
  })
  const data = schema.parse(form.fields)

  const nidDocument = form.files.find((file) => file.field === 'nid_document')
  const selfieDocument = form.files.find((file) => file.field === 'selfie_document')

  if (!nidDocument) throw new HttpError(422, 'An NID or passport document is required.')
  if (!selfieDocument) throw new HttpError(422, 'A selfie photo is required.')
  if (!VERIFICATION_MIME_TYPES.includes(nidDocument.mimeType)) {
    throw new HttpError(422, 'The NID document must be a JPG, PNG or PDF file.')
  }
  if (!SELFIE_MIME_TYPES.includes(selfieDocument.mimeType)) {
    throw new HttpError(422, 'The selfie must be a JPG or PNG image.')
  }

  const previous = await db.prepare('SELECT nid_document_path, selfie_document_path FROM member_profiles WHERE member_id = ?').get(memberId) as
    | { nid_document_path: string | null; selfie_document_path: string | null }
    | undefined

  const nid = storeVerificationDocument({ userId: memberId, data: nidDocument.data, mimeType: nidDocument.mimeType })
  const selfie = storeVerificationDocument({ userId: memberId, data: selfieDocument.data, mimeType: selfieDocument.mimeType })

  await db.prepare(
    `INSERT INTO member_profiles (member_id, full_name, nid_number, country, nid_document_path, selfie_document_path, updated_at)
     VALUES (?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(member_id) DO UPDATE SET
       full_name = excluded.full_name,
       nid_number = excluded.nid_number,
       country = excluded.country,
       nid_document_path = excluded.nid_document_path,
       selfie_document_path = excluded.selfie_document_path,
       updated_at = datetime('now')`,
  ).run(memberId, data.full_name, data.nid_number, data.country, nid.path, selfie.path)

  if (previous?.nid_document_path) deleteStoredFile(previous.nid_document_path)
  if (previous?.selfie_document_path) deleteStoredFile(previous.selfie_document_path)

  await db.prepare("UPDATE users SET verification_status = 'pending', updated_at = datetime('now') WHERE id = ?").run(memberId)
  await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    memberId,
    'verification.submitted',
    'user',
    memberId,
    JSON.stringify({ nid_document_path: nid.path }),
  )

  res.status(201).json({
    status: 'ok',
    message: 'Documents submitted. A compliance officer will review them shortly.',
  })
}

export async function claimRewardById(req: Request, res: Response) {
  const schema = z.object({ note: z.string().optional().nullable() })
  schema.parse(req.body || {})
  const memberId = req.user!.id
  const rewardId = Number(req.params.id)
  const claimId = await claimReward(memberId, rewardId)
  res.status(201).json({ id: claimId })
}
