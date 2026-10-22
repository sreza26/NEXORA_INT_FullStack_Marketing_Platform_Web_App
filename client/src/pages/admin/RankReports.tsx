import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function RankReports() {
  usePageTitle('Rank reports')
  const [data, setData] = useState<any>({ period: '', qualifiedMembers: 0, distribution: [], snapshots: [] })
  const [periodInput, setPeriodInput] = useState('')

  const load = (period?: string) => {
    api.get('/admin/rank-reports', { params: period ? { period } : {} })
      .then((res) => {
        setData(res.data)
        if (res.data?.period) setPeriodInput(res.data.period)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
  }, [])

  const handleLoad = (e: any) => {
    e.preventDefault()
    load(periodInput || undefined)
  }

  const handleRecalculate = async (e: any) => {
    e.preventDefault()
    try {
      await api.post('/admin/rank-reports/recalculate', { period: data.period })
      load()
    } catch {
      // ignore
    }
  }

  const head = [
    'Member',
    'Rank at period',
    'Paid rank',
    'Personal volume',
    'Group volume',
    'directs',
    'Salary eligible',
  ]

  const snapshotRows: any[][] = (data.snapshots || []).map((snap: any) => [
    <div key="member">
      <a className="font-semibold text-navy-900 hover:text-accent-600" href={`/admin/members/${snap.member?.id ?? snap.member_id ?? ''}`}>
        {snap.member?.name ?? '—'}
      </a>
      <p className="font-mono text-[11px] text-slate-400">{snap.member?.member_code ?? ''}</p>
    </div>,
    snap.rank?.name ?? 'Unranked',
    snap.paid_rank_id ? String(snap.paid_rank_id) : '—',
    snap.personal_volume !== undefined ? `$${Number(snap.personal_volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
    snap.group_volume !== undefined ? `$${Number(snap.group_volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
    snap.direct_referrals !== undefined ? String(snap.direct_referrals) : '—',
    <span key="badge" className={`badge ${snap.salary_eligible ? 'badge-success' : 'badge-muted'}`}>
      {snap.salary_eligible ? 'eligible' : 'no'}
    </span>,
  ])

  const rows = snapshotRows.length === 0
    ? [[
        <span key="empty" className="text-slate-400">No snapshots for this period yet — run the recalculation.</span>,
        '', '', '', '', '',
      ]]
    : snapshotRows

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Rank reports</h1>
          <p className="section-sub">
            Period: <span className="font-mono font-semibold text-navy-900">{data.period || '—'}</span> · {Number(data.qualifiedMembers ?? 0).toLocaleString('en-US')} members have earned a rank achievement.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form onSubmit={handleLoad} className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="period">Period</label>
              <input
                className="input"
                type="month"
                id="period"
                name="period"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline btn-sm">Load</button>
          </form>
          <form onSubmit={handleRecalculate}>
            <input type="hidden" name="period" value={data.period} />
            <button type="submit" className="btn btn-accent btn-sm">Recalculate period</button>
          </form>
          <p className="hint w-full">Loads snapshots for this month, format YYYY-MM.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {(data.distribution || []).map((rank: any, idx: number) => (
          <div key={idx} className="stat-card">
            <span className="stat-label">Level {rank.level} · {rank.name}</span>
            <span className="stat-value">{Number(rank.members_count ?? 0).toLocaleString('en-US')}</span>
            <span className="text-xs text-slate-400">active members</span>
          </div>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Member snapshots for {data.period || '—'}</h2>
        </div>
        <div className="table-wrap">
          <Table head={head} rows={rows} />
        </div>
      </div>
    </>
  )
}
