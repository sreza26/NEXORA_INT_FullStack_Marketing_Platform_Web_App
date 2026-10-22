import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat, Table } from '../../components/Shell'

export default function CompensationPlans() {
  usePageTitle('Compensation Plans')
  const [plans, setPlans] = useState<any[]>([])
  useEffect(() => { api.get('/admin/compensation-plans').then((res) => setPlans(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Compensation Plans</h1>
      <p className="section-sub">Manage compensation plans</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="card card-pad">
            <h2 className="font-bold text-navy-900">{p.name || `Plan ${p.id}`}</h2>
            <p className="text-sm text-slate-500">{p.description || ''}</p>
            {p.total_budget != null && <p className="money">{money(p.total_budget)}</p>}
            {p.max_earnings != null && <p className="money">{money(p.max_earnings)}</p>}
            {p.status && <p className="badge badge-info">{p.status}</p>}
          </div>
        ))}
      </div>
    </>
  )
}