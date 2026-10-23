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
  email_verified_at: string | null
  registered_at: string | null
  created_at: string
  updated_at: string
}

export interface UserWithRoles extends UserRow {
  roles: string[]
  /** Human readable role labels, matching the Laravel admin header. */
  role_labels: string[]
  permissions: string[]
  /** Name of the rank the member currently holds, when one is assigned. */
  current_rank: { id: number; name: string } | null
}

export async function generateMemberCode(): Promise<string> {
  const prefix = config.memberCodePrefix
  const length = config.memberCodeLength
  let code = ''
  do {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    code = `${prefix}-${Buffer.from(bytes).toString('hex').toUpperCase().slice(0, length)}`
  } while (await db.prepare('SELECT 1 FROM users WHERE member_code = ?').get(code))
  return code
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, config.bcryptRounds)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export async function findUserByEmail(email: string): Promise<UserWithRoles | null> {
  const row = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined
  return row ? await withRoles(row) : null
}

export async function findUserById(id: number): Promise<UserWithRoles | null> {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  return row ? await withRoles(row) : null
}

export async function findUserByCode(code: string): Promise<UserWithRoles | null> {
  const row = await db.prepare('SELECT * FROM users WHERE member_code = ?').get(code.toUpperCase()) as UserRow | undefined
  return row ? await withRoles(row) : null
}

export async function withRoles(row: UserRow): Promise<UserWithRoles> {
  const roles = (await db
    .prepare('SELECT r.name, r.label FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?')
    .all(row.id)) as { name: string; label: string | null }[]
  const roleNames = roles.map((r) => r.name)
  const roleLabels = roles.map((r) => r.label || r.name)
  const rank = row.current_rank_id
    ? ((await db.prepare('SELECT id, name FROM ranks WHERE id = ?').get(row.current_rank_id)) as
        | { id: number; name: string }
        | undefined) ?? null
    : null
  return {
    ...row,
    roles: roleNames,
    role_labels: roleLabels,
    permissions: await loadUserPermissions(row.id, roleNames),
    current_rank: rank,
  }
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  phone?: string | null
  sponsorId?: number | null
  roles?: string[]
  status?: string
  verificationStatus?: string
}): Promise<UserWithRoles> {
  const memberCode = await generateMemberCode()
  const info = await db
    .prepare(
      `INSERT INTO users (name, email, password_hash, phone, member_code, sponsor_id, status, verification_status, registered_at, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL, datetime('now'), datetime('now'))`,
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
    const roleRow = await db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number } | undefined
    if (roleRow) {
      await db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleRow.id)
    }
  }
  await db.prepare('INSERT INTO wallet_accounts (member_id, currency) VALUES (?, ?)').run(userId, config.currency)
  await db.prepare('INSERT INTO member_profiles (member_id) VALUES (?)').run(userId)
  try {
    await linkReferralClosures(userId)
  } catch {
    // Referral closure rebuild is best-effort at registration time.
  }

  return (await findUserById(userId))!
}

const NOT_DEVELOPER = `NOT EXISTS (
  SELECT 1 FROM user_roles ur_d JOIN roles r_d ON r_d.id = ur_d.role_id
  WHERE ur_d.user_id = users.id AND r_d.name = 'developer'
)`

export async function userHasRole(userId: number, role: string): Promise<boolean> {
  return !!(
    await db
      .prepare('SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name = ?')
      .get(userId, role)
  )
}

export async function listMembers(limit = 50, offset = 0, search = ''): Promise<any[]> {
  const like = `%${search.toLowerCase()}%`
  return (await db
    .prepare(
      `SELECT id, name, email, member_code, status, verification_status, sponsor_id, current_rank_id, created_at
       FROM users
       WHERE ${NOT_DEVELOPER}
         AND (? = '' OR lower(name) LIKE ? OR lower(email) LIKE ? OR lower(member_code) LIKE ?)
       ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(search, like, like, like, limit, offset)) as any[]
}

export async function countMembers(): Promise<number> {
  return (await db.prepare(`SELECT COUNT(*) AS c FROM users WHERE ${NOT_DEVELOPER}`).get() as { c: number }).c
}

export async function countByStatus(status: string): Promise<number> {
  return (await db.prepare('SELECT COUNT(*) AS c FROM users WHERE status = ?').get(status) as { c: number }).c
}

export async function countByVerification(status: string): Promise<number> {
  return (await db.prepare('SELECT COUNT(*) AS c FROM users WHERE verification_status = ?').get(status) as { c: number }).c
}
