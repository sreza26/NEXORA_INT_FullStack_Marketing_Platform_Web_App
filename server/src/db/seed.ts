import { db, migrate } from './index.js'
import { createUser, findUserByEmail } from '../models/user.js'

export const ROLES = ['member', 'super_admin', 'finance_admin', 'compliance_officer', 'support_agent'] as const

export const RANKS = [
  { code: 'MEMBER', name: 'Member', level: 1, salary: 0, min_direct_links: 0, downline_volume: 0 },
  { code: 'BRONZE', name: 'Bronze', level: 2, salary: 50, min_direct_links: 2, downline_volume: 500 },
  { code: 'SILVER', name: 'Silver', level: 3, salary: 150, min_direct_links: 5, downline_volume: 2500 },
  { code: 'GOLD', name: 'Gold', level: 4, salary: 400, min_direct_links: 10, downline_volume: 10000 },
  { code: 'PLATINUM', name: 'Platinum', level: 5, salary: 900, min_direct_links: 20, downline_volume: 30000 },
]

export function seedRoles() {
  const insert = db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)')
  for (const role of ROLES) insert.run(role)
}

export function seedRanks() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ranks (code, name, level, salary, min_direct_links, downline_volume) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  for (const rank of RANKS) {
    insert.run(rank.code, rank.name, rank.level, rank.salary, rank.min_direct_links, rank.downline_volume)
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

export function seedRewards() {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM rewards').get() as { c: number }).c
  if (count > 0) return

  const insert = db.prepare(
    'INSERT INTO rewards (title, description, image_path, cost, active) VALUES (?, ?, ?, ?, 1)',
  )
  insert.run('NEXORA Starter Kit', 'Branded welcome package for new members.', '/uploads/rewards/starter-kit.png', 25)
  insert.run('Gift Voucher', 'Digital voucher redeemable in the member dashboard.', '/uploads/rewards/gift-voucher.png', 100)
  insert.run('Premium Headset', 'Noise cancelling headset for top performers.', '/uploads/rewards/premium-headset.png', 250)
}

export function seed() {
  migrate()
  seedRoles()
  seedRanks()
  seedAdmin()
  seedDemoNetwork()
  seedRewards()
}
