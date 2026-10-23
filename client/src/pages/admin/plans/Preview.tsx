import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { usePageTitle } from '../../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../../lib/auth'

interface PlanRate {
  generation_from: number
  generation_to: number
  rate: number
}

interface Plan {
  id: number
  name: string
  version: number
  status: string
  commission_base: string
  eligible_transaction_types: string[]
  effective_from: string | null
  effective_to: string | null
  notes: string | null
  rates: PlanRate[]
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRate(rate: number): string {
  return Number(rate).toFixed(2).replace(/\.?0+$/, '')
}

export default function PlanPreview() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  usePageTitle('Plan Preview')

  async function load() {
    if (!id) return
    const res = await api.get(`/admin/compensation-plans/${id}/preview`)
    setPlan(res.data as Plan)
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!plan) return <p className="text-sm text-slate-400">Plan not found.</p>

  async function activate() {
    if (!plan) return
    const confirmed = window.confirm('Activate this plan? The current active plan will be archived immediately.')
    if (!confirmed) return
    await api.post(`/admin/compensation-plans/${plan.id}/activate`)
    await load()
  }

  return (
    <>
      <div>
        <Link to="/admin/compensation-plans" className="text-sm text-accent-600 hover:underline">← Back to plans</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="page-title">{plan.name}</h1>
          <span className="badge badge-muted">v{plan.version}</span>
          <span className={`badge ${plan.status === 'active' ? 'badge-success' : plan.status === 'draft' ? 'badge-warn' : 'badge-muted'}`}>
            {plan.status}
          </span>
        </div>
        <p className="section-sub">
          Base: <span className="font-mono text-xs">{plan.commission_base}</span>
          {' · '}Eligible types: {(plan.eligible_transaction_types ?? []).join(', ')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Generation rate table</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Generation</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Example payout on $1,000 base</th>
                </tr>
              </thead>
              <tbody>
                {(plan.rates ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">No generation rates configured.</td>
                  </tr>
                ) : (
                  [...plan.rates]
                    .sort((a, b) => a.generation_from - b.generation_from)
                    .map((rate, index) => (
                      <tr key={index}>
                        <td>Gen {rate.generation_from}{rate.generation_to !== rate.generation_from ? ` – ${rate.generation_to}` : ''}</td>
                        <td className="text-right font-semibold">{formatRate(rate.rate)}%</td>
                        <td className="text-right money">${(1000 * (rate.rate / 100)).toFixed(2)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold text-navy-900">{plan.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Version</dt>
                <dd className="font-semibold text-navy-900">{plan.version}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Effective from</dt>
                <dd className="font-semibold text-navy-900">{plan.effective_from ? formatDate(plan.effective_from) : 'Immediately (on activation)'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Effective to</dt>
                <dd className="font-semibold text-navy-900">{plan.effective_to ? formatDate(plan.effective_to) : '—'}</dd>
              </div>
            </dl>
          </div>

          {plan.notes && (
            <div className="card card-pad">
              <h2 className="font-bold text-navy-900">Notes</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{plan.notes}</p>
            </div>
          )}

          {plan.status !== 'active' && hasPermission(user, 'plans.approve') && (
            <button type="button" className="btn btn-accent w-full" onClick={() => activate().catch(() => undefined)}>
              Activate this version
            </button>
          )}
        </div>
      </div>
    </>
  )
}
