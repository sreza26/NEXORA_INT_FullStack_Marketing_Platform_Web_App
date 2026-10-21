import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const serverRoot = path.resolve(__dirname, '..', '..')

dotenv.config({ path: path.join(serverRoot, '.env') })

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const absoluteDb = process.env.DATABASE_FILE && path.isAbsolute(process.env.DATABASE_FILE)
  ? process.env.DATABASE_FILE
  : path.join(serverRoot, 'database', process.env.DATABASE_FILE ?? 'nexora.sqlite')

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 5000),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  databaseFile: absoluteDb,
  uploadsDir: path.join(serverRoot, 'storage', 'uploads'),
  currency: process.env.CURRENCY ?? 'USD',
  memberCodePrefix: process.env.MEMBER_CODE_PREFIX ?? 'NX',
  memberCodeLength: num(process.env.MEMBER_CODE_LENGTH, 8),
  commission: {
    generation: num(process.env.COMMISSION_GENERATION, 3),
    enabled: (process.env.COMMISSION_ENABLED ?? 'true') === 'true',
    rates: (process.env.COMMISSION_RATES ?? '0.10,0.05,0.03')
      .split(',')
      .map((r) => Number(r.trim()))
      .filter((r) => Number.isFinite(r)),
  },
  withdrawal: {
    minAmount: num(process.env.WITHDRAWAL_MIN, 50),
    maxAmount: num(process.env.WITHDRAWAL_MAX, 10000),
    holdDays: num(process.env.WITHDRAWAL_HOLD_DAYS, 3),
    enabled: (process.env.WITHDRAWAL_ENABLED ?? 'true') === 'true',
  },
  salary: {
    enabled: (process.env.SALARY_ENABLED ?? 'true') === 'true',
    dayOfMonth: num(process.env.SALARY_DAY, 1),
  },
  rewards: {
    enabled: (process.env.REWARDS_ENABLED ?? 'true') === 'true',
  },
  registration: {
    sponsorRequired: (process.env.SPONSOR_REQUIRED ?? 'false') === 'true',
  },
}

export type AppConfig = typeof config
