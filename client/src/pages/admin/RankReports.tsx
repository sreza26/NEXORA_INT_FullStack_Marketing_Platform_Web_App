import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../lib/auth'

interface RankReportSnapshot {
  id: number
  member_id: number
  rank_id: number | null
  paid_rank_id: number | null
  personal_volume: number
  group_volume: number
  direct_referrals: number | null
  salary_eligible: number | boolean
  member_name: string | null
  member_code: string | null
  rank_name: string | null
}

interface RankReportDistribution {
  level: number
  name: string
  members_count: number
}

interface RankReportResponse {
  period: string
  qualifiedMembers: number
  distribution: RankReportDistribution[]
  snapshots: RankReportSnapshot[]
}

export default function RankReports() {
  usePageTitle('Rank reports')
  const { user } = useAuth()
  const [data, setData] = useState<RankReportResponse>({
    period: '',
    qualifiedMembers: 0,
    distribution: [],
    snapshots: [],
  })
  const [periodInput, setPeriodInput] = useState('')

  function load(period?: string) {
    const params = period ? { period } : {}
    api.get('/admin/rank-reports', { params })
      .then((res) => {
        const report = res.data as RankReportResponse
        setData(report)
        if (report.period) setPeriodInput(report.period)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault()
    load(periodInput || undefined)
  }

  async function handleRecalculate(e: React.FormEvent) {
    e.preventDefault()
    if (!window.confirm(`Recalculate rank qualifications for ${data.period}?`)) return
    try {
      await api.post('/admin/rank-reports/recalculate', { period: data.period })
      load()
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Rank reports</h1>
          <p className="section-sub">
            Period: <span className="font-mono font-semibold text-navy-900">{data.period}</span> · {Number(data.qualifiedMembers ?? 0).toLocaleString('en-US')} members have earned a rank achievement.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form onSubmit={handleLoad} className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="period">Period</label>
              <input className="input" type="month" id="period" value={periodInput} onChange={(e) => setPeriodInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-outline btn-sm">Load</button>
          </form>
          {hasPermission(user, 'ranks.manage') && (
            <form onSubmit={handleRecalculate}>
              <input type="hidden" name="period" value={data.period} />
              <button type="submit" className="btn btn-accent btn-sm">Recalculate period</button>
            </form>
          )}
          <p className="hint w-full">Loads snapshots for this month, format YYYY-MM.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {data.distribution.map((rank) => (
          <div key={rank.level} className="stat-card">
            <span className="stat-label">Level {rank.level} · {rank.name}</span>
            <span className="stat-value">{Number(rank.members_count ?? 0).toLocaleString('en-US')}</span>
            <span className="text-xs text-slate-400">active members</span>
          </div>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Member snapshots for {data.period}</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Rank at period</th>
                <th className="text-right">Paid rank</th>
                <th className="text-right">Personal volume</th>
                <th className="text-right">Group volume</th>
                <th className="text-right"> directs</th>
                <th>Salary eligible</th>
              </tr>
            </thead>
            <tbody>
              {data.snapshots.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400">No snapshots for this period yet — run the recalculation.</td></tr>
              ) : (
                data.snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>
                      <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${snapshot.member_id}`}>
                        {snapshot.member_name ?? '—'}
                      </Link>
                      <p className="font-mono text-[11px] text-slate-400">{snapshot.member_code}</p>
                    </td>
                    <td className="text-sm">{snapshot.rank_name ?? 'Unranked'}</td>
                    <td className="text-right text-sm">{snapshot.paid_rank_id ?? '—'}</td>
                    <td className="text-right money">${Number(snapshot.personal_volume ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="text-right money">${Number(snapshot.group_volume ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="text-right">{snapshot.direct_referrals ?? '—'}</td>
                    <td>
                      <span className={`badge ${snapshot.salary_eligible ? 'badge-success' : 'badge-muted'}`}>{snapshot.salary_eligible ? 'eligible' : 'no'}</span>
                    </td>
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
