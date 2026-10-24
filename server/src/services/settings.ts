import { db } from '../db/index.js'
import { config } from '../config/index.js'

type CacheEntry = { value: string; expiresAt: number }
const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL_MS = 60_000

function getCache(key: string): string | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function setCache(key: string, value: string, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateSetting(key?: string) {
  if (key) {
    cache.delete(key)
    return
  }
  cache.clear()
}

export async function getSettingRaw(key: string, fallback?: string): Promise<string | undefined> {
  const cached = getCache(key)
  if (cached !== undefined) return cached

  try {
    const row = (await db.prepare('SELECT value FROM application_settings WHERE key = ?').get(key)) as
      | { value: string }
      | undefined
    if (row && row.value !== null && row.value !== undefined) {
      setCache(key, String(row.value))
      return String(row.value)
    }
  } catch {
    // ignore DB errors and fall back
  }

  if (fallback !== undefined) {
    setCache(key, String(fallback))
    return String(fallback)
  }
  return undefined
}

export async function getSettingBool(key: string, fallback: boolean): Promise<boolean> {
  const raw = await getSettingRaw(key)
  if (raw === undefined || raw === null) return fallback
  return raw === '1' || String(raw).toLowerCase() === 'true'
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSettingRaw(key)
  if (raw === undefined || raw === null) return fallback
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) return parsed
  return fallback
}

// Withdrawal settings (migrated to DB with env fallbacks)
export async function getWithdrawalSettings() {
  const [enabled, minAmount, maxAmount, holdDays] = await Promise.all([
    getSettingBool('withdrawals.enabled', config.withdrawal.enabled),
    getSettingNumber('withdrawals.min_amount', config.withdrawal.minAmount),
    getSettingNumber('withdrawals.max_amount', config.withdrawal.maxAmount),
    getSettingNumber('withdrawals.hold_days', config.withdrawal.holdDays),
  ])
  return { enabled, minAmount, maxAmount, holdDays }
}

export async function getWithdrawalEnabled(): Promise<boolean> {
  return getSettingBool('withdrawals.enabled', config.withdrawal.enabled)
}

export async function getWithdrawalMinAmount(): Promise<number> {
  return getSettingNumber('withdrawals.min_amount', config.withdrawal.minAmount)
}

export async function getWithdrawalMaxAmount(): Promise<number> {
  return getSettingNumber('withdrawals.max_amount', config.withdrawal.maxAmount)
}

export async function getWithdrawalHoldDays(): Promise<number> {
  return getSettingNumber('withdrawals.hold_days', config.withdrawal.holdDays)
}
