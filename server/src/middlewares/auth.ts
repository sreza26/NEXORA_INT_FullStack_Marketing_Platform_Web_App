import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { findUserById } from '../models/user.js'

export interface AuthUser {
  id: number
  email: string
  name: string
  member_code: string
  roles: string[]
  status: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  })
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as unknown as { sub: number | string }
    const user = findUserById(Number(payload.sub))
    if (!user) {
      res.status(401).json({ message: 'Account not found' })
      return
    }
    if (user.status !== 'active') {
      res.status(403).json({ message: 'Account is not active' })
      return
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      member_code: user.member_code,
      roles: user.roles,
      status: user.status,
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }
    if (roles.length > 0 && !roles.some((role) => req.user!.roles.includes(role))) {
      res.status(403).json({ message: 'You do not have permission to perform this action' })
      return
    }
    next()
  }
}

export function isAdmin(user?: AuthUser): boolean {
  if (!user) return false
  return user.roles.some((role) => role !== 'member')
}
