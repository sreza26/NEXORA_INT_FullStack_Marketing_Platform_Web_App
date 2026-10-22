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

export interface GenerationRate {
  generation_from: number;
  generation_to: number;
  rate: number;
}

export const DEFAULT_GENERATION_RATES: GenerationRate[] = [
  { generation_from: 1, generation_to: 1, rate: 5 },
  { generation_from: 2, generation_to: 2, rate: 3 },
  { generation_from: 3, generation_to: 3, rate: 2 },
  { generation_from: 4, generation_to: 5, rate: 1.5 },
  { generation_from: 6, generation_to: 10, rate: 1 },
  { generation_from: 11, generation_to: 20, rate: 0.5 },
]

function parseGenerationRates(raw: string | undefined): GenerationRate[] {
  if (!raw) return DEFAULT_GENERATION_RATES
  try {
    const parsed = JSON.parse(raw) as GenerationRate[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_GENERATION_RATES
    return parsed
  } catch {
    return DEFAULT_GENERATION_RATES
  }
}

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
  // Password hashing cost. The Laravel reference uses BCRYPT_ROUNDS=12.
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 12),
  // Key material for encrypting secrets at rest (withdrawal account details).
  encryptionKey: process.env.ENCRYPTION_KEY ?? process.env.APP_KEY ?? 'nexora-development-encryption-key',
  rateLimit: {
    login: { max: num(process.env.RATE_LIMIT_LOGIN, 5), windowMs: 60_000 },
    registration: { max: num(process.env.RATE_LIMIT_REGISTRATION, 10), windowMs: 3_600_000 },
    sensitive: { max: num(process.env.RATE_LIMIT_SENSITIVE, 10), windowMs: 60_000 },
    contact: { max: num(process.env.RATE_LIMIT_CONTACT, 10), windowMs: 60_000 },
  },
  commission: {
    generation: num(process.env.COMMISSION_GENERATION, 3),
    enabled: (process.env.COMMISSION_ENABLED ?? 'true') === 'true',
    rates: (process.env.COMMISSION_RATES ?? '0.10,0.05,0.03')
      .split(',')
      .map((r) => Number(r.trim()))
      .filter((r) => Number.isFinite(r)),
    generationRates: parseGenerationRates(process.env.COMMISSION_GENERATION_RATES),
  },
  withdrawal: {
    // Laravel reference: config/nexora.php withdrawals.min_amount = 10.
    minAmount: num(process.env.WITHDRAWAL_MIN, 10),
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
