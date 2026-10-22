import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Trophy, Users, BarChart3, TrendingUp, Link2 } from 'lucide-react'

interface Requirement {
  satisfied: boolean
  label: string
  actual: number
  required: number
}

interface Summary {
  user: any
  wallet: { balance: number; pending_balance?: number }
  direct_referrals: number
  total_network: number
  team_volume: number
  rank: any
  pending_withdrawals: number
  commission_total?: number
}

interface Progress {
  current: any
  next: any
  requirements: Requirement[]
}

interface RewardElig {
  reward: { name: string }
  eligible: boolean
  reason?: string
}

interface LedgerEntry {
  type: string
  amount: number
  direction: string
  created_at: string
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [rewardEligibility, setRewardEligibility] = useState<RewardElig[]>([])
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([])
  const [salaryEligible, setSalaryEligible] = useState(false)
  const [pendingCommissions, setPendingCommissions] = useState(0)
  const [approvedUnpaid, setApprovedUnpaid] = useState(0)
  const [lifetimeVolume, setLifetimeVolume] = useState(0)
  const [periodVolume, setPeriodVolume] = useState(0)
  const [downlineCount, setDownlineCount] = useState(0)
  const [teamGrowth, setTeamGrowth] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] })
  const [volumeSeries, setVolumeSeries] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] })

  useEffect(() => {
    async function load() {
      try {
        const [sRes, pRes, rRes, wRes] = await Promise.all([
          api.get('/member/summary'),
          api.get('/member/rank-progress'),
          api.get('/member/rewards'),
          api.get('/member/wallet'),
        ])
        const s = sRes.data
        setSummary(s)
        setProgress(pRes.data.progress)
        setDownlineCount(s.total_network || 0)
        setPendingCommissions(Number(s.commission_total || 0))
        setApprovedUnpaid(0)
        setLifetimeVolume(Number(s.team_volume || 0))
        setPeriodVolume(Number(s.team_volume || 0))
        const elig = (rRes.data.eligibility || []).filter((e: any) => e.eligible).slice(0, 3).map((e: any) => ({
          reward: { name: e.reward?.title || e.reward?.name },
          eligible: !!e.eligible,
          reason: e.reason,
        }))
        setRewardEligibility(elig)
        setRecentEntries((wRes.data.entries || []).slice(0, 8))
        setSalaryEligible(!!s.rank)
      } catch {
        setSummary(null)
      }
    }
    load()
  }, [])

  if (!summary) return <p className="text-sm text-slate-400">Loading…</p>

  const firstName = summary.user?.name?.split(' ')[0] || summary.user?.name || ''

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="section-sub">Here is your network and earnings snapshot for the current period.</p>
        </div>
        <Link to="/member/referrals" className="btn btn-accent btn-sm">
          <Link2 className="h-4 w-4" /> Copy referral link
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Available balance</span>
          <span className="stat-value">{money(summary.wallet?.balance || 0)}</span>
          <span className="text-xs text-slate-400">Pending: {money(summary.wallet?.pending_balance || 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Commissions pending</span>
          <span className="stat-value">{money(pendingCommissions)}</span>
          <span className="text-xs text-slate-400">Approved unpaid: {money(approvedUnpaid)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime volume</span>
          <span className="stat-value">{money(lifetimeVolume)}</span>
          <span className="text-xs text-slate-400">Current period: {money(periodVolume)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Team size</span>
          <span className="stat-value">{Number(summary.direct_referrals || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-400">direct</span></span>
          <span className="text-xs text-slate-400">{Number(downlineCount || 0).toLocaleString()} total downline</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy-900">Rank progress</h2>
              <p className="text-sm text-slate-500">
                Current: <strong>{progress?.current?.name || 'Unranked'}</strong>
                {progress?.next ? <> &rarr; Next: <strong>{progress.next.name}</strong></> : null}
              </p>
            </div>
            <span className={`badge ${salaryEligible ? 'badge-success' : 'badge-muted'}`}>
              {salaryEligible ? 'Salary eligible this period' : 'Salary not yet qualified'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(progress?.requirements || []).length === 0 ? (
              <p className="text-sm text-slate-400">No next-rank requirements configured yet.</p>
            ) : (
              (progress?.requirements || []).map((req, idx) => {
                const pct = req.required > 0 ? Math.min(100, Math.round((Number(req.actual) / Number(req.required)) * 100)) : (req.satisfied ? 100 : 0)
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        {req.satisfied ? <Trophy className="h-4 w-4 text-emerald-500" /> : <Users className="h-4 w-4 text-slate-300" />}
                        {req.label}
                      </span>
                      <span className="tabular-nums text-slate-500">
                        {Number(req.actual).toFixed(2)} / {Number(req.required).toFixed(2)}
                      </span>
                    </div>
                    <div className="progress-track mt-1.5">
                      <div className="progress-fill" style={{ width: pct + '%' }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team growth (6 mo)</span>
                <TrendingUp className="h-4 w-4 text-accent-500" />
              </div>
              <div className="mt-3 h-40"></div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly volume (6 mo)</span>
                <BarChart3 className="h-4 w-4 text-gold-500" />
              </div>
              <div className="mt-3 h-40"></div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Reward eligibility</h2>
            <div className="mt-3 space-y-3">
              {rewardEligibility.length === 0 ? (
                <p className="text-sm text-slate-400">No active rewards configured.</p>
              ) : (
                rewardEligibility.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{item.reward.name}</p>
                      <p className="text-xs text-slate-400">{item.reason || 'Ready to claim'}</p>
                    </div>
                    <span className={`badge ${item.eligible ? 'badge-success' : 'badge-muted'}`}>{item.eligible ? 'Eligible' : 'Locked'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-900">Recent wallet activity</h2>
              <Link to="/member/wallet" className="text-xs font-semibold text-accent-600 hover:underline">View ledger</Link>
            </div>
            <div className="mt-3 space-y-2">
              {recentEntries.length === 0 ? (
                <p className="text-sm text-slate-400">No ledger entries yet.</p>
              ) : (
                recentEntries.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-navy-900">{String(entry.type).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                      <p className="text-xs text-slate-400">{entry.created_at ? new Date(entry.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                    </div>
                    <span className={`font-semibold tabular-nums ${entry.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.direction === 'credit' ? '+' : '-'}{money(Number(entry.amount || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
