import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Ranks() {
  usePageTitle('Rank configuration')
  const [ranks, setRanks] = useState<any[]>([])

  useEffect(() => {
    api.get('/admin/ranks').then((res) => setRanks(res.data)).catch(() => undefined)
  }, [])

  const handleSave = async (rank: any, salary: string, active: boolean) => {
    try {
      await api.put(`/admin/ranks/${rank.id}`, {
        monthly_salary: Number(salary),
        is_active: active ? 1 : 0,
      })
      setRanks((prev) => prev.map((r) => (r.id === rank.id ? { ...r, monthly_salary: Number(salary), is_active: active } : r)))
    } catch {
      // silently ignore save errors
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Rank configuration</h1>
        <p className="section-sub">Monthly salary and active flag per rank. Qualification thresholds come from the seeded plan and are read-only here.</p>
      </div>

      <div className="mt-6 space-y-4">
        {ranks.map((rank) => (
          <RankCard key={rank.id} rank={rank} onSave={handleSave} />
        ))}
      </div>
    </>
  )
}

function RankCard({ rank, onSave }: { rank: any; onSave: (rank: any, salary: string, active: boolean) => void }) {
  const [salary, setSalary] = useState(String(rank.monthly_salary ?? ''))
  const [active, setActive] = useState(Boolean(rank.is_active))

  return (
    <div className="card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-lg font-black text-accent-400">
            {rank.level}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-navy-900">{rank.name}</h2>
              <span className={`badge ${rank.is_active ? 'badge-success' : 'badge-muted'}`}>
                {rank.is_active ? 'active' : 'inactive'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Monthly salary <span className="font-semibold text-navy-900">${Number(rank.monthly_salary ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
            {Array.isArray(rank.requirements) && rank.requirements.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {rank.requirements.map((req: any, idx: number) => (
                  <li key={idx} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-navy-900">
                    {req.metric ?? req.type} {req.operator ?? ''} {Number(req.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {req.targetRank ? ` · target: ${req.targetRank.name}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(rank, salary, active)
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="w-40">
            <label className="label" htmlFor={`salary-${rank.id}`}>Monthly salary (USD)</label>
            <input
              className="input"
              type="number"
              step={1}
              min={0}
              max={1000000}
              id={`salary-${rank.id}`}
              name="monthly_salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              name="is_active"
              value={1}
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <p className="hint w-full">Amount paid to the member each month while they hold this rank.</p>
          <p className="hint w-full">Inactive ranks are excluded from salary and rank calculations.</p>
        </form>
      </div>
    </div>
  )
}
