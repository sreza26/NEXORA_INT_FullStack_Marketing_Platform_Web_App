import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Overview() {
  const [stats, setStats] = useState<any>(null)
  const [pending, setPending] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      api.get('/admin/summary'),
      api.get('/admin/withdrawals?status=pending'),
    ])
      .then(([s, p]) => {
        setStats(s.data)
        setPending(p.data)
      })
      .catch(() => setStats(null))
  }, [])

  if (!stats) return <p className="text-sm text-slate-400">Loading…</p>

  const jobs = stats.recentJobRuns || []

  function fmtStarted(at?: string | null) {
    if (!at) return '—'
    const d = new Date(String(at).replace(' ', 'T'))
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${h}:${m}`
  }

  function fmtDur(start?: string | null, end?: string | null) {
    if (!start || !end) return '—'
    const s = new Date(String(start).replace(' ', 'T')).getTime()
    const e = new Date(String(end).replace(' ', 'T')).getTime()
    return `${Math.round((e - s) / 1000)}s`
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Platform overview</h1>
          <p className="section-sub">Live snapshot of members, money and pending work.</p>
        </div>
        <a href="/admin/reports" className="btn btn-outline btn-sm flex items-center gap-2">
          <span>📊</span> Reports
        </a>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Total members</span>
          <span className="stat-value">{Number(stats.members ?? stats.total_members ?? 0).toLocaleString()}</span>
          <span className="text-xs text-slate-400">{Number(stats.activeMembers ?? stats.active_members ?? 0).toLocaleString()} active</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Platform verified volume</span>
          <span className="stat-value money">${Number(stats.platformVolume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">lifetime eligible volume</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Wallet balance held</span>
          <span className="stat-value money">${Number(stats.walletTotals?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">${Number(stats.walletTotals?.pending ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} pending credit</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime credited</span>
          <span className="stat-value money">${Number(stats.walletTotals?.credited ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">${Number(stats.walletTotals?.debited ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} debited</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Recent scheduled jobs</h2>
          </div>
          <div className="table-wrap">
            <Table
              head={['Job', 'Status', 'Processed', 'Started', 'Duration']}
              rows={jobs.map((j: any) => [
                <span className="font-mono text-xs">{j.job_name ?? ''}</span>,
                <span className={`badge ${j.status === 'success' ? 'badge-success' : j.status === 'failed' ? 'badge-danger' : 'badge-warn'}`}>{j.status ?? '—'}</span>,
                <span className="text-right tabular-nums">{j.processed_count ?? '—'}</span>,
                fmtStarted(j.started_at),
                fmtDur(j.started_at, j.finished_at),
              ])}
            />
          </div>
          {jobs.length === 0 && (
            <p className="px-5 py-4 text-center text-sm text-slate-400">No job runs recorded yet.</p>
          )}
        </div>

        <div className="card card-pad">
          <h2 className="font-bold text-navy-900">Quick links</h2>
          <div className="mt-3 space-y-2 text-sm">
            <a className="side-link" href="/admin/verifications">
              Verification queue
            </a>
            <a className="side-link" href="/admin/transactions">
              Business transactions
            </a>
            <a className="side-link" href="/admin/withdrawals">
              Withdrawal requests
            </a>
            <a className="side-link" href="/admin/ledger">
              Immutable ledger
            </a>
            <a className="side-link" href="/admin/audit-logs">
              Audit trail
            </a>
            <a className="side-link" href="/admin/jobs">
              Job monitor
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Pending withdrawal requests</h2>
            <p className="text-sm text-slate-500">Awaiting finance review</p>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['Member', 'Amount', 'Method', 'Requested']}
            rows={pending.map((w) => [
              w.member_name,
              money(w.amount),
              w.method,
              new Date(String(w.requested_at).replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
