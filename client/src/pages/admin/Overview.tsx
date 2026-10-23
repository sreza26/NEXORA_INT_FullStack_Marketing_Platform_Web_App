import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpen,
  FileBarChart,
  History,
  Receipt,
  UserPlus,
} from 'lucide-react'
import type { ChartConfiguration } from 'chart.js/auto'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import ChartCanvas from '../../components/ChartCanvas'

interface JobRun {
  id: number
  job_name: string
  status: string
  processed_count: number | null
  started_at: string | null
  finished_at: string | null
}

interface Series {
  labels: string[]
  values: number[]
}

interface Summary {
  members: number
  activeMembers: number
  platformVolume: number
  walletTotals: { balance: number; pending: number; credited: number; debited: number }
  recentJobRuns: JobRun[]
  pendingVerifications: number
  pendingTransactions: number
  pendingCommissions: number
  pendingSalary: number
  pendingWithdrawals: number
  months: number
  registrations: Series
  volume: Series
}

function formatStarted(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T'))
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-GB', { month: 'short' })
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${hours}:${minutes}`
}

function formatDuration(started: string | null, finished: string | null): string {
  if (!started || !finished) return '—'
  const diff = new Date(finished.replace(' ', 'T')).getTime() - new Date(started.replace(' ', 'T')).getTime()
  return `${Math.round(diff / 1000)}s`
}

export default function Overview() {
  usePageTitle('Dashboard')
  const [stats, setStats] = useState<Summary | null>(null)

  useEffect(() => {
    api
      .get('/admin/summary')
      .then((res) => setStats(res.data as Summary))
      .catch(() => setStats(null))
  }, [])

  if (!stats) return <p className="text-sm text-slate-400">Loading…</p>

  const jobs = stats.recentJobRuns ?? []

  const registrationConfig: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: stats.registrations.labels,
      datasets: [
        {
          label: 'Registrations',
          data: stats.registrations.values,
          backgroundColor: '#06b6d4',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  }

  const volumeConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: stats.volume.labels,
      datasets: [
        {
          label: 'Verified volume',
          data: stats.volume.values,
          borderColor: '#d4a017',
          backgroundColor: 'rgba(212,160,23,0.12)',
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    },
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Platform overview</h1>
          <p className="section-sub">Live snapshot of members, money and pending work.</p>
        </div>
        <Link to="/admin/reports" className="btn btn-outline btn-sm">
          <FileBarChart className="h-4 w-4" /> Reports
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Total members</span>
          <span className="stat-value">{Number(stats.members).toLocaleString()}</span>
          <span className="text-xs text-slate-400">{Number(stats.activeMembers).toLocaleString()} active</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Platform verified volume</span>
          <span className="stat-value money">${Number(stats.platformVolume).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">lifetime eligible volume</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Wallet balance held</span>
          <span className="stat-value money">${Number(stats.walletTotals.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">${Number(stats.walletTotals.pending).toLocaleString('en-US', { maximumFractionDigits: 0 })} pending credit</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime credited</span>
          <span className="stat-value money">${Number(stats.walletTotals.credited).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-slate-400">${Number(stats.walletTotals.debited).toLocaleString('en-US', { maximumFractionDigits: 0 })} debited</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link to="/admin/verifications" className="stat-card hover:border-accent-500 transition">
          <span className="stat-label">Verifications</span>
          <span className="stat-value">{Number(stats.pendingVerifications).toLocaleString()}</span>
          <span className="text-xs text-slate-400">awaiting review</span>
        </Link>
        <Link to="/admin/transactions" className="stat-card hover:border-accent-500 transition">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">{Number(stats.pendingTransactions).toLocaleString()}</span>
          <span className="text-xs text-slate-400">pending verification</span>
        </Link>
        <Link to="/admin/commissions" className="stat-card hover:border-accent-500 transition">
          <span className="stat-label">Commissions</span>
          <span className="stat-value">{Number(stats.pendingCommissions).toLocaleString()}</span>
          <span className="text-xs text-slate-400">awaiting approval</span>
        </Link>
        <Link to="/admin/salary" className="stat-card hover:border-accent-500 transition">
          <span className="stat-label">Salary payouts</span>
          <span className="stat-value">{Number(stats.pendingSalary).toLocaleString()}</span>
          <span className="text-xs text-slate-400">awaiting approval</span>
        </Link>
        <Link to="/admin/withdrawals" className="stat-card hover:border-accent-500 transition">
          <span className="stat-label">Withdrawals</span>
          <span className="stat-value">{Number(stats.pendingWithdrawals).toLocaleString()}</span>
          <span className="text-xs text-slate-400">awaiting review</span>
        </Link>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-navy-900">New registrations</h2>
              <p className="text-sm text-slate-500">Active members per month (last {stats.months} months)</p>
            </div>
            <UserPlus className="h-5 w-5 text-accent-500" />
          </div>
          <div className="mt-4 h-56">
            <ChartCanvas config={registrationConfig} />
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-navy-900">Platform verified volume</h2>
              <p className="text-sm text-slate-500">Company-wide eligible volume per month</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gold-500" />
          </div>
          <div className="mt-4 h-56">
            <ChartCanvas config={volumeConfig} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
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
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400">No job runs recorded yet.</td>
                  </tr>
                ) : (
                  jobs.map((run) => (
                    <tr key={run.id}>
                      <td className="font-mono text-xs">{run.job_name}</td>
                      <td>
                        <span className={`badge ${run.status === 'success' ? 'badge-success' : run.status === 'failed' ? 'badge-danger' : 'badge-warn'}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{run.processed_count ?? '—'}</td>
                      <td className="text-sm text-slate-500">{formatStarted(run.started_at)}</td>
                      <td className="text-sm text-slate-500">{formatDuration(run.started_at, run.finished_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="font-bold text-navy-900">Quick links</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link className="side-link" to="/admin/verifications">
              <BadgeCheck className="h-4 w-4" /> Verification queue
            </Link>
            <Link className="side-link" to="/admin/transactions">
              <Receipt className="h-4 w-4" /> Business transactions
            </Link>
            <Link className="side-link" to="/admin/withdrawals">
              <Banknote className="h-4 w-4" /> Withdrawal requests
            </Link>
            <Link className="side-link" to="/admin/ledger">
              <BookOpen className="h-4 w-4" /> Immutable ledger
            </Link>
            <Link className="side-link" to="/admin/audit-logs">
              <History className="h-4 w-4" /> Audit trail
            </Link>
            <Link className="side-link" to="/admin/jobs">
              <Activity className="h-4 w-4" /> Job monitor
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
