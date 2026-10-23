import os from 'os'
import process from 'process'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { config } from '../config/index.js'
import { HttpError } from '../middlewares/error.js'
import * as svc from '../services/admin.js'

const startedAt = new Date()

async function tableCounts() {
  const tables = (await db
    .prepare(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = DATABASE() ORDER BY table_name`,
    )
    .all()) as Array<{ name: string }>

  const counts: Record<string, number> = {}
  for (const table of tables) {
    counts[table.name] = await svc.countRows(`SELECT COUNT(*) AS c FROM \`${table.name}\``)
  }
  return counts
}

async function databaseSize(): Promise<number> {
  try {
    const row = (await db
      .prepare(
        `SELECT COALESCE(SUM(data_length + index_length), 0) AS size
         FROM information_schema.tables WHERE table_schema = DATABASE()`,
      )
      .get()) as { size: number } | undefined
    return Number(row?.size ?? 0)
  } catch {
    return 0
  }
}

export async function overview(_req: Request, res: Response) {
  const memory = process.memoryUsage()
  const counts = await tableCounts()
  const size = await databaseSize()

  res.json({
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      env: config.env,
      app_url: config.appUrl,
      client_origins: config.clientOrigins,
      port: config.port,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hostname: os.hostname(),
      started_at: startedAt.toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      memory_rss_mb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
      memory_heap_mb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
      database_name: config.db.name,
      database_size_kb: Math.round((size / 1024) * 10) / 10,
      mysql_version: ((await db.prepare('SELECT VERSION() AS v').get()) as { v: string }).v,
      currency: config.currency,
      bcrypt_rounds: config.bcryptRounds,
      jwt_expires_in: config.jwtExpiresIn,
    },
    tables: counts,
    pending: await svc.pendingCounts(),
    recentJobRuns: await svc.jobRunRows(10),
    demoData: await svc.demoDataReport(),
  })
}

export async function users(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const like = `%${q.toLowerCase()}%`

  const rows = (await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.member_code, u.phone, u.status, u.verification_status,
              u.sponsor_id, u.registered_at, u.created_at, u.updated_at, u.email_verified_at,
              (SELECT GROUP_CONCAT(r.name) FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = u.id) AS role_names,
              (SELECT COUNT(*) FROM business_transactions bt WHERE bt.member_id = u.id) AS transactions_count,
              (SELECT COUNT(*) FROM commissions c WHERE c.recipient_id = u.id) AS commissions_count,
              (SELECT COUNT(*) FROM notifications n WHERE n.member_id = u.id) AS notifications_count,
              (SELECT COUNT(*) FROM audit_logs a WHERE a.actor_id = u.id) AS audit_count,
              (SELECT MAX(a.created_at) FROM audit_logs a WHERE a.actor_id = u.id) AS last_activity_at,
              (SELECT COALESCE(w.balance, 0) FROM wallet_accounts w WHERE w.member_id = u.id) AS wallet_balance
       FROM users u
       WHERE (? = '' OR lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(u.member_code) LIKE ?)
       ORDER BY u.id DESC LIMIT 500`,
    )
    .all(q, like, like, like)) as unknown as Array<Record<string, unknown>>

  res.json({
    items: rows.map((row) => {
      const roles = row.role_names ? String(row.role_names).split(',') : []
      return {
        ...row,
        roles,
        activity_count: svc.num(row.transactions_count) + svc.num(row.commissions_count) + svc.num(row.notifications_count),
        is_developer: roles.includes('developer'),
      }
    }),
    total: rows.length,
  })
}

export async function userDetail(req: Request, res: Response) {
  const id = Number(req.params.id)
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) throw new HttpError(404, 'User not found')

  const roles = (
    (await db
      .prepare('SELECT r.name, r.label FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.name')
      .all(id)) as Array<{ name: string; label: string | null }>
  ).map((role) => ({ name: role.name, label: role.label ?? role.name }))

  const profile = (await db.prepare('SELECT * FROM member_profiles WHERE member_id = ?').get(id)) ?? null
  const wallet = (await db.prepare('SELECT * FROM wallet_accounts WHERE member_id = ?').get(id)) ?? null

  const transactions = await db
    .prepare(
      `SELECT id, reference, gross_amount, eligible_amount, amount, type, description, status, created_at, verified_at
       FROM business_transactions WHERE member_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(id)
  const commissions = await db
    .prepare(
      `SELECT id, source_member_id, source_transaction_id, generation, amount, rate, status, created_at
       FROM commissions WHERE recipient_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(id)
  const ledger = await db
    .prepare(
      `SELECT id, type, direction, amount, status, description, created_at
       FROM ledger_entries WHERE member_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(id)
  const notifications = await db
    .prepare(
      `SELECT id, title, body, read_at, created_at FROM notifications WHERE member_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(id)
  const audit = await db
    .prepare(
      `SELECT id, action, subject_type, subject_id, ip_address, created_at FROM audit_logs
       WHERE actor_id = ? OR (subject_type = 'user' AND subject_id = ?) ORDER BY id DESC LIMIT 50`,
    )
    .all(id, id)
  const snapshots = await db
    .prepare(
      `SELECT id, rank_id, period, salary_eligible, personal_volume, group_volume, direct_referrals, created_at
       FROM member_rank_snapshots WHERE member_id = ? ORDER BY id DESC LIMIT 24`,
    )
    .all(id)

  res.json({
    user: { ...row, password_hash: undefined, remember_token: undefined, roles },
    profile,
    wallet,
    transactions,
    commissions,
    ledger,
    notifications,
    audit,
    snapshots,
  })
}

export async function activity(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const action = String(req.query.action ?? '').trim()
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const perPage = Math.min(Math.max(Number(req.query.perPage ?? 50) || 50, 1), 200)

  const where: string[] = []
  const params: unknown[] = []
  if (q) {
    where.push('(lower(a.action) LIKE ? OR lower(COALESCE(u.email, \'\')) LIKE ? OR lower(COALESCE(u.name, \'\')) LIKE ?)')
    const like = `%${q.toLowerCase()}%`
    params.push(like, like, like)
  }
  if (action) {
    where.push('a.action LIKE ?')
    params.push(`${action}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const total = await svc.countRows(
      `SELECT COUNT(*) AS c FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ${whereSql}`,
      ...params,
    )
  const items = await db
    .prepare(
      `SELECT a.id, a.actor_id, a.action, a.subject_type, a.subject_id, a.ip_address, a.created_at,
              u.name AS actor_name, u.email AS actor_email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ${whereSql} ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...(params as never[]), perPage, (page - 1) * perPage)

  const actions = (
    (await db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all()) as Array<{ action: string }>
  ).map((row) => row.action)

  const recentTransactions = await db
    .prepare(
      `SELECT t.id, t.reference, t.amount, t.status, t.created_at, u.name AS member_name, u.email AS member_email
       FROM business_transactions t LEFT JOIN users u ON u.id = t.member_id ORDER BY t.id DESC LIMIT 25`,
    )
    .all()

  res.json({
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    actions,
    recentTransactions,
    recentJobRuns: await svc.jobRunRows(25),
  })
}

export async function demoData(_req: Request, res: Response) {
  res.json(await svc.demoDataReport())
}

export async function purgeDemoData(req: Request, res: Response) {
  const schema = z.object({ confirm: z.literal('DELETE') })
  schema.parse(req.body ?? {})

  const result = await svc.deleteDemoData()
  if (result.deleted) {
    await svc.recordAudit(req.user!.id, 'developer.demo_data.deleted', 'system', null, result, req.ip)
  }
  res.json(result)
}
