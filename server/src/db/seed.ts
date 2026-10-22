import { db, migrate } from './index.js'
import { createUser, findUserByEmail } from '../models/user.js'
import { DEFAULT_GENERATION_RATES } from '../config/index.js'
import {
  dropLegacyRolePermissions,
  ensurePermissionCatalogue,
  ensureRolePermissionMatrix,
  migrateLegacyRolePermissions,
  syncRolePermissionMatrix,
} from '../models/permissions.js'
import { rebuildAllReferralClosures } from '../services/closure.js'

export const ROLES = ['member', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'] as const

export const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
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

export function seedRoles() {
  const insert = db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)')
  for (const role of ROLES) insert.run(role)

  const label = db.prepare('UPDATE roles SET label = ?, description = ? WHERE name = ?')
  for (const role of ROLES) {
    const text = ROLE_LABELS[role] ?? role
    label.run(text, `${text} role`, role)
  }
}

export function seedCompensationPlan() {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM compensation_plans').get() as { c: number }).c
  if (count > 0) return

  const info = db
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
    insertRate.run(planId, rate.generation_from, rate.generation_to, rate.rate)
  }
}

export function seedRanks() {
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
    insertRank.run(rank.code, rank.name, rank.level, rank.salary, rank.min_direct_links, rank.downline_volume)
    const row = db.prepare('SELECT id FROM ranks WHERE code = ?').get(rank.code) as { id: number }
    clearRequirements.run(row.id)
    const requirements = RANK_REQUIREMENTS[rank.code] ?? []
    requirements.forEach((requirement, index) => {
      insertRequirement.run(
        row.id,
        requirement.type,
        requirement.value,
        requirement.label,
        requirement.target_rank_code ?? null,
        index + 1,
      )
    })
  }
}

export function seedAdmin(email = 'admin@nexora.test', password = 'Password123!') {
  if (findUserByEmail(email)) return null
  return createUser({
    name: 'Platform Admin',
    email,
    password,
    roles: ['super_admin', 'finance_admin', 'compliance_officer'],
    verificationStatus: 'verified',
  })
}

export function seedDemoNetwork() {
  if (findUserByEmail('leader@nexora.test')) return null

  const leader = createUser({
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
      createUser({
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
export function seedPermissions() {
  ensurePermissionCatalogue()

  const existing = (db.prepare('SELECT COUNT(*) AS c FROM permission_role').get() as { c: number }).c

  if (existing === 0) {
    migrateLegacyRolePermissions()
    syncRolePermissionMatrix()
  } else {
    ensureRolePermissionMatrix()
  }

  dropLegacyRolePermissions()
}

export function seedRewards() {
  const insert = db.prepare(
    'INSERT INTO rewards (title, description, image_path, cost, threshold_amount, active) VALUES (?, ?, ?, ?, ?, 1)',
  )
  const find = db.prepare('SELECT id FROM rewards WHERE title = ?')
  for (const reward of REWARDS) {
    if (find.get(reward.title)) continue
    insert.run(reward.title, reward.description, reward.image_path, reward.cost, reward.cost)
  }
}

export function seedSettings() {
  const defaults = [
    ['deposits.enabled', '1', 'boolean'],
    ['deposits.commissionable', '0', 'boolean'],
    ['commission.processing_enabled', '1', 'boolean'],
    ['profit_share.enabled', '0', 'boolean'],
    ['rank.require_separate_branches', '0', 'boolean'],
    ['referral.allow_registration_without_sponsor', '1', 'boolean'],
    ['legal.review_completed', '0', 'boolean'],
  ]

  for (const [key, value, type] of defaults) {
    db.prepare(
      `INSERT OR IGNORE INTO application_settings (key, value, group_name, type) VALUES (?, ?, 'runtime', ?)`,
    ).run(key, value, type)
  }
}

function ensureColumn(table: string, column: string, type: string, defaultValue?: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (info.some((c) => c.name === column)) return
  const def = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : ''
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`)
}

export function seed() {
  migrate()
  ensureColumn('member_profiles', 'full_name', 'TEXT')
  ensureColumn('member_profiles', 'nid_number', 'TEXT')
  ensureColumn('member_profiles', 'nid_document_path', 'TEXT')
  ensureColumn('member_profiles', 'selfie_document_path', 'TEXT')
  ensureColumn('member_profiles', 'emergency_contact', 'TEXT')
  ensureColumn('users', 'email_verified_at', 'TEXT')
  seedRoles()
  seedRanks()
  seedCompensationPlan()
  seedAdmin()
  seedDemoNetwork()
  try {
    rebuildAllReferralClosures()
  } catch {
    // Referral closures are rebuilt when possible.
  }
  seedRewards()
  seedPermissions()
  seedSettings()
  seedMemberExtras()
}

export function seedMemberExtras() {
  const leader = db.prepare('SELECT id FROM users WHERE email = ?').get('leader@nexora.test') as { id: number } | undefined
  if (leader) {
    db.prepare('INSERT INTO wallet_accounts (member_id, currency) VALUES (?, ?) ON CONFLICT(member_id) DO NOTHING').run(leader.id, 'USD')
    db.prepare(`INSERT INTO ledger_entries (member_id, type, direction, amount, balance_after, reference_type, description, status)
      VALUES (?, 'commission', 'credit', 250.00, 250.00, 'commission', 'Direct commission', 'completed')`).run(leader.id)
    db.prepare(`UPDATE wallet_accounts SET balance = 250.00 WHERE member_id = ?`).run(leader.id)
  }
}
