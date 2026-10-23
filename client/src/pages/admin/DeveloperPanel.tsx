import { useCallback, useEffect, useState } from 'react'
import { Activity, Database, RefreshCw, Search, Server, Terminal, Trash2, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

type Tab = 'overview' | 'users' | 'activity' | 'demo'

interface JobRun {
  id: number
  job_name: string
  status: string
  processed_count: number | null
  started_at: string | null
  finished_at: string | null
}

interface Overview {
  environment: Record<string, string | number | string[]>
  tables: Record<string, number>
  pending: Record<string, number>
  recentJobRuns: JobRun[]
  demoData: DemoReport
}

interface DemoReport {
  demo: boolean
  users: number
  transactions: number
  [key: string]: number | boolean
}

interface DevUser {
  id: number
  name: string
  email: string
  member_code: string
  phone: string | null
  status: string
  verification_status: string
  sponsor_id: number | null
  registered_at: string | null
  created_at: string
  updated_at: string
  last_activity_at: string | null
  roles: string[]
  transactions_count: number
  commissions_count: number
  notifications_count: number
  audit_count: number
  activity_count: number
  wallet_balance: number
  is_developer: boolean
}

interface AuditRow {
  id: number
  actor_id: number | null
  actor_name: string | null
  actor_email: string | null
  action: string
  subject_type: string | null
  subject_id: number | null
  ip_address: string | null
  created_at: string
}

interface ActivityData {
  items: AuditRow[]
  total: number
  page: number
  totalPages: number
  actions: string[]
  recentTransactions: Array<{
    id: number
    reference: string
    amount: number
    status: string
    created_at: string
    member_name: string | null
    member_email: string | null
  }>
  recentJobRuns: JobRun[]
}

interface UserDetail {
  user: DevUser & Record<string, unknown>
  profile: Record<string, unknown> | null
  wallet: Record<string, unknown> | null
  transactions: Array<Record<string, unknown>>
  commissions: Array<Record<string, unknown>>
  ledger: Array<Record<string, unknown>>
  notifications: Array<Record<string, unknown>>
  audit: Array<Record<string, unknown>>
  snapshots: Array<Record<string, unknown>>
}

function timestamp(value: unknown): string {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 19)
}

function money(value: unknown): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value ?? 0))
}

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Server className="h-4 w-4" /> },
  { id: 'users', label: 'Users & activity', icon: <Users className="h-4 w-4" /> },
  { id: 'activity', label: 'Audit stream', icon: <Activity className="h-4 w-4" /> },
  { id: 'demo', label: 'Demo data', icon: <Database className="h-4 w-4" /> },
]

export default function DeveloperPanel() {
  usePageTitle('Developer Panel')
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Developer panel</h1>
          <p className="section-sub">
            System-level diagnostics, user activity and demo data maintenance. Visible only to the application developer.
          </p>
        </div>
        <span className="badge badge-info">
          <Terminal className="mr-1 h-3 w-3" /> developer
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`btn btn-sm ${tab === entry.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.icon} {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'demo' && <DemoTab />}
      </div>
    </>
  )
}

function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/developer/overview')
      .then((res) => setData(res.data as Overview))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) return <p className="text-sm text-slate-400">Loading diagnostics…</p>
  if (!data) return <p className="text-sm text-rose-500">Unable to load diagnostics.</p>

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.pending).map(([key, value]) => (
          <div key={key} className="stat-card">
            <span className="stat-label">{key.replace(/([A-Z])/g, ' $1').replace(/^pending/i, 'Pending')}</span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card card-pad">
          <h2 className="font-bold text-navy-900">Runtime environment</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            {Object.entries(data.environment).map(([key, value]) => (
              <div key={key}>
                <dt className="stat-label">{key.split('_').join(' ')}</dt>
                <dd className="break-all font-mono text-xs text-navy-900">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card card-pad">
          <h2 className="font-bold text-navy-900">Table row counts</h2>
          <div className="mt-3 max-h-80 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th className="text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.tables).map(([table, count]) => (
                  <tr key={table}>
                    <td className="font-mono text-xs">{table}</td>
                    <td className={`text-right tabular-nums ${count === 0 ? 'text-slate-400' : ''}`}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Recent scheduled jobs</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th className="text-right">Processed</th>
                <th>Started</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No job runs recorded yet.
                  </td>
                </tr>
              ) : (
                data.recentJobRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="font-mono text-xs">{run.job_name}</td>
                    <td>
                      <span className={`badge ${run.status === 'success' ? 'badge-success' : run.status === 'failed' ? 'badge-danger' : 'badge-warn'}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{run.processed_count ?? '—'}</td>
                    <td className="text-sm text-slate-500">{timestamp(run.started_at)}</td>
                    <td className="text-sm text-slate-500">{timestamp(run.finished_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function UsersTab() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<DevUser[]>([])
  const [selected, setSelected] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback((q: string) => {
    setLoading(true)
    api
      .get('/developer/users', { params: { q } })
      .then((res) => setItems((res.data?.items ?? []) as DevUser[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  function openUser(id: number) {
    api
      .get(`/developer/users/${id}`)
      .then((res) => setSelected(res.data as UserDetail))
      .catch(() => setSelected(null))
  }

  return (
    <>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          load(query)
        }}
      >
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="dev-user-search">
            Search users
          </label>
          <input
            id="dev-user-search"
            className="input"
            placeholder="Name, email or member code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search className="h-4 w-4" /> Search
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setQuery(''); load('') }}>
          Reset
        </button>
      </form>

      <div className="card mt-4 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Verification</th>
                <th className="text-right">Activity</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400">
                    No users matched.
                  </td>
                </tr>
              ) : (
                items.map((user) => (
                  <tr key={user.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openUser(user.id)}>
                    <td className="tabular-nums">{user.id}</td>
                    <td className="font-medium text-navy-900">
                      {user.name}
                      {user.is_developer && <span className="badge badge-info ml-2">developer</span>}
                    </td>
                    <td className="text-sm text-slate-500">{user.email}</td>
                    <td className="text-xs">{user.roles.join(', ') || '—'}</td>
                    <td>
                      <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warn'}`}>{user.status}</span>
                    </td>
                    <td className="text-xs">{user.verification_status}</td>
                    <td className="text-right tabular-nums">{user.activity_count}</td>
                    <td className="text-sm text-slate-500">{timestamp(user.last_activity_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card card-pad mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy-900">
                {String(selected.user.name)} <span className="font-mono text-xs text-slate-400">#{String(selected.user.id)}</span>
              </h2>
              <p className="text-sm text-slate-500">
                {String(selected.user.email)} · {String(selected.user.member_code)} · joined {timestamp(selected.user.created_at)}
              </p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <span className="stat-label">Wallet balance</span>
              <span className="stat-value money">{money(selected.wallet?.balance)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Transactions</span>
              <span className="stat-value">{selected.transactions.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Commissions</span>
              <span className="stat-value">{selected.commissions.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Notifications</span>
              <span className="stat-value">{selected.notifications.length}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="font-semibold text-navy-900">Recent transactions</h3>
              <div className="table-wrap mt-2">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-slate-400">
                          No transactions.
                        </td>
                      </tr>
                    ) : (
                      selected.transactions.slice(0, 10).map((row) => (
                        <tr key={String(row.id)}>
                          <td className="font-mono text-xs">{String(row.reference ?? '—')}</td>
                          <td className="text-right tabular-nums">{money(row.amount)}</td>
                          <td className="text-xs">{String(row.status ?? '')}</td>
                          <td className="text-sm text-slate-500">{timestamp(row.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-navy-900">Recent audit events</h3>
              <div className="table-wrap mt-2">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Subject</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.audit.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-400">
                          No audit events.
                        </td>
                      </tr>
                    ) : (
                      selected.audit.slice(0, 10).map((row) => (
                        <tr key={String(row.id)}>
                          <td className="font-mono text-xs">{String(row.action ?? '')}</td>
                          <td className="text-xs">
                            {String(row.subject_type ?? '—')}
                            {row.subject_id ? ` #${String(row.subject_id)}` : ''}
                          </td>
                          <td className="text-sm text-slate-500">{timestamp(row.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ActivityTab() {
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [data, setData] = useState<ActivityData | null>(null)

  const load = useCallback(() => {
    api
      .get('/developer/activity', { params: { q: query, action } })
      .then((res) => setData(res.data as ActivityData))
      .catch(() => setData(null))
  }, [query, action])

  useEffect(() => {
    load()
  }, [load])

  if (!data) return <p className="text-sm text-slate-400">Loading audit stream…</p>

  return (
    <>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          load()
        }}
      >
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="dev-activity-search">
            Search
          </label>
          <input
            id="dev-activity-search"
            className="input"
            placeholder="Action, actor name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="min-w-48">
          <label className="label" htmlFor="dev-activity-action">
            Action prefix
          </label>
          <select id="dev-activity-action" className="input" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">All actions</option>
            {data.actions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <Search className="h-4 w-4" /> Filter
        </button>
      </form>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Audit stream</h2>
          <p className="text-sm text-slate-500">{data.total} events</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Subject</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No audit events matched.
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm text-slate-500">{timestamp(row.created_at)}</td>
                    <td className="text-sm">
                      <span className="font-medium text-navy-900">{row.actor_name ?? 'system'}</span>
                      {row.actor_email && <span className="block text-xs text-slate-400">{row.actor_email}</span>}
                    </td>
                    <td className="font-mono text-xs">{row.action}</td>
                    <td className="text-xs">
                      {row.subject_type ?? '—'}
                      {row.subject_id ? ` #${row.subject_id}` : ''}
                    </td>
                    <td className="font-mono text-xs text-slate-400">{row.ip_address ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Recent business transactions</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Member</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400">
                      No transactions.
                    </td>
                  </tr>
                ) : (
                  data.recentTransactions.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs">{row.reference}</td>
                      <td className="text-sm text-slate-500">{row.member_name ?? row.member_email ?? '—'}</td>
                      <td className="text-right tabular-nums">{money(row.amount)}</td>
                      <td className="text-xs">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Job runs</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJobRuns.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">
                      No job runs recorded.
                    </td>
                  </tr>
                ) : (
                  data.recentJobRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="font-mono text-xs">{run.job_name}</td>
                      <td className="text-xs">{run.status}</td>
                      <td className="text-sm text-slate-500">{timestamp(run.started_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function DemoTab() {
  const [report, setReport] = useState<DemoReport | null>(null)
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api
      .get('/developer/demo-data')
      .then((res) => setReport(res.data as DemoReport))
      .catch(() => setReport(null))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function purge() {
    setBusy(true)
    setMessage('')
    try {
      const res = await api.delete('/developer/demo-data', { data: { confirm } })
      setMessage(res.data?.deleted ? 'Demo data deleted.' : 'No demo data found.')
      setConfirm('')
      load()
    } catch (error: any) {
      setMessage(error.response?.data?.message ?? 'Unable to delete demo data.')
    } finally {
      setBusy(false)
    }
  }

  if (!report) return <p className="text-sm text-slate-400">Loading demo data report…</p>

  return (
    <>
      {message && <p className="flash-ok mb-4">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(report)
          .filter(([key]) => key !== 'demo')
          .map(([key, value]) => (
            <div key={key} className="stat-card">
              <span className="stat-label">{key.split('_').join(' ')}</span>
              <span className="stat-value">{String(value)}</span>
            </div>
          ))}
      </div>

      <div className="card card-pad mt-6">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-rose-500" />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-navy-900">Delete demo data</h2>
            <p className="mt-1 text-sm text-slate-500">
              Removes the seeded <span className="font-mono text-xs">@demo.test</span> members, their network, wallets,
              profiles and the synthetic <span className="font-mono text-xs">DEMO-*</span> business transactions. Real
              members are untouched.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <label className="label" htmlFor="dev-demo-confirm">
                  Type DELETE to confirm
                </label>
                <input
                  id="dev-demo-confirm"
                  className="input"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={busy || confirm !== 'DELETE' || !report.demo}
                onClick={purge}
              >
                <Trash2 className="h-4 w-4" /> {busy ? 'Deleting…' : 'Delete demo data'}
              </button>
            </div>
            {!report.demo && <p className="hint">No demo data is present.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
