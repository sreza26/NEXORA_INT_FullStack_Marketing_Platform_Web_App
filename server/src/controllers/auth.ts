import type { Request, Response } from 'express'
import { z } from 'zod'
import { config } from '../config/index.js'
import { HttpError } from '../middlewares/error.js'
import { signToken } from '../middlewares/auth.js'
import { createUser, findUserByCode, findUserByEmail, findUserById, hashPassword, verifyPassword, type UserWithRoles } from '../models/user.js'
import { db } from '../db/index.js'

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('A valid email is required'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  sponsor_code: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

function serializeUser(user: UserWithRoles) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    member_code: user.member_code,
    sponsor_id: user.sponsor_id,
    current_rank_id: user.current_rank_id,
    status: user.status,
    verification_status: user.verification_status,
    roles: user.roles,
    role_labels: user.role_labels,
    permissions: user.permissions,
    current_rank: user.current_rank,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

async function publicUser(id: number) {
  return serializeUser((await findUserById(id))!)
}

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body)

  if (data.password !== data.password_confirmation) {
    throw new HttpError(422, 'Password confirmation does not match')
  }
  if (await findUserByEmail(data.email)) {
    throw new HttpError(422, 'This email is already registered')
  }

  let sponsorId: number | null = null
  if (data.sponsor_code) {
    const sponsor = await findUserByCode(data.sponsor_code)
    if (!sponsor) throw new HttpError(422, 'The sponsor code provided is not valid')
    sponsorId = sponsor.id
  } else if (config.registration.sponsorRequired) {
    throw new HttpError(422, 'A sponsor code is required to register')
  }

  const user = await createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone ?? null,
      sponsorId,
      roles: ['member'],
    })

  await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    'member.registered',
    'user',
    user.id,
    JSON.stringify({ sponsor_id: sponsorId }),
  )

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    member_code: user.member_code,
    roles: user.roles,
    permissions: user.permissions,
    status: user.status,
  })

  res.status(201).json({ token, user: serializeUser(user) })
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body)
  const user = await findUserByEmail(data.email)

  if (!user || !verifyPassword(data.password, user.password_hash)) {
    throw new HttpError(401, 'These credentials do not match our records')
  }
  if (user.status !== 'active') {
    throw new HttpError(403, 'Your account is not active. Please contact support.')
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    member_code: user.member_code,
    roles: user.roles,
    permissions: user.permissions,
    status: user.status,
  })

  res.json({ token, user: serializeUser(user) })
}

export async function me(req: Request, res: Response) {
  res.json({ user: await publicUser(req.user!.id) })
}

/* -------------------------------------------------------------------------
 | Password reset (Laravel password.request / password.update)
 | ---------------------------------------------------------------------- */

const forgotPasswordSchema = z.object({
  email: z.string().email('A valid email is required'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'The password reset link is invalid or has expired.'),
  email: z.string().email('A valid email is required'),
  password: z
    .string()
    .min(8, 'The password must be at least 8 characters.')
    .regex(/[A-Za-z]/, 'The password must contain at least one letter.')
    .regex(/[0-9]/, 'The password must contain at least one number.'),
  password_confirmation: z.string(),
})

/**
 * Issue a password reset token.
 *
 * The Laravel reference mails the link. There is no mail transport in the
 * TypeScript build, so outside production the link is returned in the
 * response so the flow can still be walked through end to end.
 */
export async function forgotPassword(req: Request, res: Response) {
  const data = forgotPasswordSchema.parse(req.body)
  const user = await findUserByEmail(data.email)

  if (!user) {
    throw new HttpError(422, "We can't find a user with that email address.")
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  await db.prepare(
    `INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET token = excluded.token, created_at = excluded.created_at`,
  ).run(user.email, token)

  await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    'auth.password_reset_requested',
    'user',
    user.id,
    JSON.stringify({ email: user.email }),
  )

  const resetUrl = `${config.appUrl}/reset-password/${token}?email=${encodeURIComponent(user.email)}`

  res.json({
    status: 'We have emailed your password reset link.',
    ...(config.env === 'production' ? {} : { reset_url: resetUrl }),
  })
}

/**
 * Consume a password reset token and store the new password.
 */
export async function resetPassword(req: Request, res: Response) {
  const data = resetPasswordSchema.parse(req.body)

  if (data.password !== data.password_confirmation) {
    throw new HttpError(422, 'The password confirmation does not match.')
  }

  const record = (await db
    .prepare('SELECT email, token FROM password_reset_tokens WHERE email = ?')
    .get(data.email.toLowerCase())) as { email: string; token: string } | undefined

  if (!record || record.token !== data.token) {
    throw new HttpError(422, 'The password reset link is invalid or has expired.')
  }

  const user = await findUserByEmail(data.email)
  if (!user) {
    throw new HttpError(422, 'The password reset link is invalid or has expired.')
  }

  await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    hashPassword(data.password),
    user.id,
  )
  await db.prepare('DELETE FROM password_reset_tokens WHERE email = ?').run(user.email)
  await db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    'auth.password_reset',
    'user',
    user.id,
    JSON.stringify({ email: user.email }),
  )

  res.json({ status: 'Your password has been reset.' })
}

/* -------------------------------------------------------------------------
 | Email verification (Laravel verification.notice / verification.send)
 | ---------------------------------------------------------------------- */

export async function emailVerificationStatus(req: Request, res: Response) {
  const user = (await findUserById(req.user!.id))!
  res.json({
    email: user.email,
    verified: Boolean(user.email_verified_at),
    verified_at: user.email_verified_at ?? null,
  })
}

/**
 * Re-send the verification link.
 *
 * As with the password reset, the link is only echoed back outside
 * production because the build has no mail transport.
 */
export async function sendEmailVerification(req: Request, res: Response) {
  const user = (await findUserById(req.user!.id))!
  if (user.email_verified_at) {
    return res.json({ status: 'The email address is already verified.', verified: true })
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(user.id)
  await db.prepare(
    'INSERT INTO email_verification_tokens (user_id, token, created_at) VALUES (?, ?, datetime(\'now\'))',
  ).run(user.id, token)

  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`

  res.json({
    status: 'Verification link sent.',
    ...(config.env === 'production' ? {} : { verification_url: verificationUrl }),
  })
}

/**
 * Consume a verification token and mark the address as verified.
 */
export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.query.token ?? '')
  if (!token) {
    throw new HttpError(422, 'The verification link is invalid or has expired.')
  }

  const record = await db.prepare('SELECT user_id FROM email_verification_tokens WHERE token = ?').get(token) as
    | { user_id: number }
    | undefined

  if (!record) {
    throw new HttpError(422, 'The verification link is invalid or has expired.')
  }

  await db.prepare("UPDATE users SET email_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(
    record.user_id,
  )
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(record.user_id)

  res.json({ status: 'Email verified.' })
}
