import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { linkReferralClosures } from '../services/closure.js'
import { loadUserPermissions } from './permissions.js'

export interface UserRow {
  id: number
  name: string
  email: string
  password_hash: string
  phone: string | null
  member_code: string
  sponsor_id: number | null
  current_rank_id: number | null
  status: string
  verification_status: string
  registered_at: string | null
  created_at: string
  updated_at: string
}

export interface UserWithRoles extends UserRow {
  roles: string[]
  permissions: string[]
}

export function generateMemberCode(): string {
  const prefix = config.memberCodePrefix
  const length = config.memberCodeLength
  let code = ''
  do {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    code = `${prefix}-${Buffer.from(bytes).toString('hex').toUpperCase().slice(0, length)}`
  } while (db.prepare('SELECT 1 FROM users WHERE member_code = ?').get(code))
  return code
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, config.bcryptRounds)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export function findUserByEmail(email: string): UserWithRoles | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined
  return row ? withRoles(row) : null
}

export function findUserById(id: number): UserWithRoles | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  return row ? withRoles(row) : null
}

export function findUserByCode(code: string): UserWithRoles | null {
  const row = db.prepare('SELECT * FROM users WHERE member_code = ?').get(code.toUpperCase()) as UserRow | undefined
  return row ? withRoles(row) : null
}

export function withRoles(row: UserRow): UserWithRoles {
  const roles = db
    .prepare('SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?')
    .all(row.id) as { name: string }[]
  const roleNames = roles.map((r) => r.name)
  return { ...row, roles: roleNames, permissions: loadUserPermissions(row.id, roleNames) }
}

export function createUser(input: {
  name: string
  email: string
  password: string
  phone?: string | null
  sponsorId?: number | null
  roles?: string[]
  status?: string
  verificationStatus?: string
}): UserWithRoles {
  const memberCode = generateMemberCode()
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, phone, member_code, sponsor_id, status, verification_status, registered_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
    )
    .run(
      input.name,
      input.email.toLowerCase(),
      hashPassword(input.password),
      input.phone ?? null,
      memberCode,
      input.sponsorId ?? null,
      input.status ?? 'active',
      input.verificationStatus ?? 'verified',
    )

  const userId = Number(info.lastInsertRowid)
  const roles = input.roles?.length ? input.roles : ['member']
  for (const role of roles) {
    const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number } | undefined
    if (roleRow) {
      db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleRow.id)
    }
  }
  db.prepare('INSERT INTO wallet_accounts (member_id, currency) VALUES (?, ?)').run(userId, config.currency)
  db.prepare('INSERT INTO member_profiles (member_id) VALUES (?)').run(userId)
  try {
    linkReferralClosures(userId)
  } catch {
    // Referral closure rebuild is best-effort at registration time.
  }

  return findUserById(userId)!
}

export function listMembers(limit = 50, offset = 0, search = '') {
  const like = `%${search.toLowerCase()}%`
  return db
    .prepare(
      `SELECT id, name, email, member_code, status, verification_status, sponsor_id, current_rank_id, created_at
       FROM users
       WHERE (? = '' OR lower(name) LIKE ? OR lower(email) LIKE ? OR lower(member_code) LIKE ?)
       ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(search, like, like, like, limit, offset) as any[]
}

export function countMembers(): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c
}

export function countByStatus(status: string): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM users WHERE status = ?').get(status) as { c: number }).c
}

export function countByVerification(status: string): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM users WHERE verification_status = ?').get(status) as { c: number }).c
}
