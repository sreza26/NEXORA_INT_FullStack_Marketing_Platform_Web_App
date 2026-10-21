import type { Request, Response } from 'express'
import { z } from 'zod'
import { config } from '../config/index.js'
import { HttpError } from '../middlewares/error.js'
import { signToken } from '../middlewares/auth.js'
import { createUser, findUserByCode, findUserByEmail, findUserById, verifyPassword } from '../models/user.js'
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

function publicUser(id: number) {
  const user = findUserById(id)!
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
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

export function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body)

  if (data.password !== data.password_confirmation) {
    throw new HttpError(422, 'Password confirmation does not match')
  }
  if (findUserByEmail(data.email)) {
    throw new HttpError(422, 'This email is already registered')
  }

  let sponsorId: number | null = null
  if (data.sponsor_code) {
    const sponsor = findUserByCode(data.sponsor_code)
    if (!sponsor) throw new HttpError(422, 'The sponsor code provided is not valid')
    sponsorId = sponsor.id
  } else if (config.registration.sponsorRequired) {
    throw new HttpError(422, 'A sponsor code is required to register')
  }

  const user = createUser({
    name: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone ?? null,
    sponsorId,
    roles: ['member'],
  })

  db.prepare('INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, payload) VALUES (?, ?, ?, ?, ?)').run(
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
    status: user.status,
  })

  res.status(201).json({ token, user: publicUser(user.id) })
}

export function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body)
  const user = findUserByEmail(data.email)

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
    status: user.status,
  })

  res.json({ token, user: publicUser(user.id) })
}

export function me(req: Request, res: Response) {
  res.json({ user: publicUser(req.user!.id) })
}
