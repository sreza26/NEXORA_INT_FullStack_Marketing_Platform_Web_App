import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..')

process.env.NODE_ENV = 'test'
process.env.DATABASE_FILE = 'smoke-test.sqlite'
process.env.JWT_SECRET = 'smoke-test-secret'
process.env.PORT = '5099'

const dbFile = path.join(serverRoot, 'database', 'smoke-test.sqlite')
for (const suffix of ['', '-wal', '-shm']) {
  const file = `${dbFile}${suffix}`
  if (fs.existsSync(file)) {
    try { fs.rmSync(file) } catch {}
  }
}

const { createApp } = await import('../src/app.js')
const { migrate } = await import('../src/db/index.js')
const { seed } = await import('../src/db/seed.js')

migrate()
seed()

const app = createApp()
const server = app.listen(5099)

const BASE = 'http://127.0.0.1:5099'
let passed = 0
let failed = 0

function check(label: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed += 1
    console.log(`  [PASS] ${label}`)
  } else {
    failed += 1
    console.log(`  [FAIL] ${label}`, extra ?? '')
  }
}

async function call(method: string, url: string, body?: unknown, token?: string) {
  const response = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: response.status, data }
}

console.log('\nNEXORA smoke test\n')

console.log('health')
{
  const res = await call('GET', '/health')
  check('GET /health returns ok', res.status === 200 && res.data?.status === 'ok', res.data)
}

console.log('\npublic config')
{
  const res = await call('GET', '/api/public/config')
  check('GET /api/public/config returns commission table', res.status === 200 && res.data?.commission?.rates?.length > 0, res.data)
}

console.log('\nregistration and referral')
let sponsorToken = ''
let memberToken = ''
let sponsorCode = ''
{
  const sponsor = await call('POST', '/api/auth/register', {
    name: 'Sponsor One',
    email: 'sponsor.one@test.local',
    password: 'Password123!',
    password_confirmation: 'Password123!',
  })
  check('register creates an account', sponsor.status === 201 && !!sponsor.data?.token, sponsor.data)
  sponsorToken = sponsor.data?.token ?? ''
  sponsorCode = sponsor.data?.user?.member_code ?? ''

  const duplicate = await call('POST', '/api/auth/register', {
    name: 'Duplicate',
    email: 'sponsor.one@test.local',
    password: 'Password123!',
    password_confirmation: 'Password123!',
  })
  check('duplicate email is rejected', duplicate.status === 422, duplicate.data)

  const member = await call('POST', '/api/auth/register', {
    name: 'Member One',
    email: 'member.one@test.local',
    password: 'Password123!',
    password_confirmation: 'Password123!',
    sponsor_code: sponsorCode,
  })
  check('register with a sponsor code succeeds', member.status === 201 && !!member.data?.token, member.data)
  memberToken = member.data?.token ?? ''

  const badSponsor = await call('POST', '/api/auth/register', {
    name: 'Member Two',
    email: 'member.two@test.local',
    password: 'Password123!',
    password_confirmation: 'Password123!',
    sponsor_code: 'NX-00000000',
  })
  check('invalid sponsor code is rejected', badSponsor.status === 422, badSponsor.data)

  const mismatch = await call('POST', '/api/auth/register', {
    name: 'Member Three',
    email: 'member.three@test.local',
    password: 'Password123!',
    password_confirmation: 'Different123!',
  })
  check('password confirmation mismatch is rejected', mismatch.status === 422, mismatch.data)
}

console.log('\nauthentication')
{
  const bad = await call('POST', '/api/auth/login', { email: 'sponsor.one@test.local', password: 'wrong-password' })
  check('wrong password is rejected', bad.status === 401, bad.data)

  const good = await call('POST', '/api/auth/login', { email: 'sponsor.one@test.local', password: 'Password123!' })
  check('valid credentials return a token', good.status === 200 && !!good.data?.token, good.data)

  const unauthorized = await call('GET', '/api/member/summary')
  check('protected route needs a token', unauthorized.status === 401, unauthorized.data)

  const forbidden = await call('GET', '/api/admin/summary', undefined, memberToken)
  check('member cannot reach admin routes', forbidden.status === 403, forbidden.data)
}

console.log('\nnetwork and commissions')
{
  const admin = await call('POST', '/api/auth/login', { email: 'admin@nexora.test', password: 'Password123!' })
  check('admin login works', admin.status === 200 && !!admin.data?.token, admin.data)
  const adminToken = admin.data?.token ?? ''

  const memberId = (await call('GET', '/api/auth/me', undefined, memberToken)).data?.user?.id
  const purchase = await call(
    'POST',
    '/api/admin/purchases',
    { member_id: memberId, amount: 500, reference: 'SMOKE-001' },
    adminToken,
  )
  check('admin records a purchase', purchase.status === 201, purchase.data)
  check('one commission is generated', purchase.data?.commissions?.created === 1, purchase.data?.commissions)

  const replay = await call(
    'POST',
    '/api/admin/purchases',
    { member_id: memberId, amount: 500, reference: 'SMOKE-001' },
    adminToken,
  )
  check('duplicate reference is rejected', replay.status === 422, replay.data)

  const commissions = await call('GET', '/api/member/commissions', undefined, sponsorToken)
  check('sponsor sees the commission', commissions.data?.items?.length === 1, commissions.data)
  check('commission amount follows the rate', commissions.data?.items?.[0]?.amount === 50, commissions.data?.items?.[0])

  const ledger = await call('GET', '/api/member/ledger', undefined, sponsorToken)
  check('commission is credited to the wallet', ledger.data?.balance === 50, ledger.data?.balance)
}

console.log('\nwithdrawals')
{
  const summary = await call('GET', '/api/member/summary', undefined, sponsorToken)
  const admin = await call('POST', '/api/auth/login', { email: 'admin@nexora.test', password: 'Password123!' })
  const adminToken = admin.data?.token ?? ''

  const tooSmall = await call(
    'POST',
    '/api/member/withdrawals',
    { amount: 1, method: 'bank', account_details: '1234567890' },
    sponsorToken,
  )
  check('below the minimum is rejected', tooSmall.status === 500 || tooSmall.status === 422, tooSmall.data)

  const request = await call(
    'POST',
    '/api/member/withdrawals',
    { amount: 50, method: 'bank', account_details: '1234567890' },
    sponsorToken,
  )
  check('valid request is accepted', request.status === 201, request.data)

  const balanceAfterHold = (await call('GET', '/api/member/ledger', undefined, sponsorToken)).data?.balance
  check('funds are held while pending', balanceAfterHold === 0, balanceAfterHold)

  const pending = await call('GET', '/api/admin/withdrawals?status=pending', undefined, adminToken)
  check('admin sees the pending request', pending.data?.length === 1, pending.data)

  const approve = await call('POST', `/api/admin/withdrawals/${request.data.id}`, { action: 'approve' }, adminToken)
  check('admin approves the request', approve.status === 200 && approve.data?.status === 'approved', approve.data)

  const ledger = await call('GET', '/api/member/ledger', undefined, sponsorToken)
  check('approved withdrawal is marked approved', ledger.data?.items?.some((e: any) => e.status === 'approved' && e.type === 'withdrawal'), ledger.data)
}

console.log('\nrewards')
{
  const rewards = await call('GET', '/api/member/rewards', undefined, sponsorToken)
  check('reward catalogue is available', rewards.data?.rewards?.length > 0, rewards.data)

  const admin = await call('POST', '/api/auth/login', { email: 'admin@nexora.test', password: 'Password123!' })
  const adminToken = admin.data?.token ?? ''

  const created = await call(
    'POST',
    '/api/admin/rewards',
    { title: 'Smoke Reward', description: 'Created by the smoke test', cost: 0 },
    adminToken,
  )
  check('admin creates a reward', created.status === 201, created.data)

  const claim = await call('POST', '/api/member/rewards/claim', { reward_id: created.data?.id }, sponsorToken)
  check('member claims a reward', claim.status === 201, claim.data)
}

console.log('\nranks and reporting')
{
  const admin = await call('POST', '/api/auth/login', { email: 'admin@nexora.test', password: 'Password123!' })
  const adminToken = admin.data?.token ?? ''

  const recalc = await call('POST', '/api/admin/ranks/recalculate', undefined, adminToken)
  check('rank recalculation runs', recalc.status === 200, recalc.data)

  const csv = await fetch(`${BASE}/api/admin/report?format=csv`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const csvText = await csv.text()
  check('csv report downloads', csv.status === 200 && csvText.includes('member_code'), csv.status)

  const xlsx = await fetch(`${BASE}/api/admin/report?format=xlsx`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const xlsxBuffer = await xlsx.arrayBuffer()
  check('xlsx report downloads', xlsx.status === 200 && xlsxBuffer.byteLength > 1000, xlsxBuffer.byteLength)
}

server.close()

for (const suffix of ['', '-wal', '-shm']) {
  const file = `${dbFile}${suffix}`
  if (fs.existsSync(file)) {
    try { fs.rmSync(file) } catch {}
  }
}
try { fs.rmSync(dbFile) } catch {}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
