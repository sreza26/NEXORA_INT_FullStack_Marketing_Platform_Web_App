import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
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
  created_by_name: string
  approved_by_name: string | null
  approved_at: string | null
  rates: PlanRate[]
}

interface DraftForm {
  name: string
  commission_base: string
  effective_from: string
  eligible_types: string[]
  notes: string
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

export default function PlansIndex() {
  usePageTitle('Compensation Plans')
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<DraftForm>({
    name: '',
    commission_base: 'eligible_verified_amount',
    effective_from: '',
    eligible_types: ['sale'],
    notes: '',
  })
  const [rates, setRates] = useState<PlanRate[]>([
    { generation_from: 1, generation_to: 1, rate: 5 },
    { generation_from: 2, generation_to: 2, rate: 3 },
    { generation_from: 3, generation_to: 3, rate: 2 },
  ])

  async function load() {
    const res = await api.get('/admin/compensation-plans')
    setPlans((res.data ?? []) as Plan[])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function createPlan(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    try {
      await api.post('/admin/compensation-plans', form)
      setMessage('Draft created.')
      setForm({
        name: '',
        commission_base: 'eligible_verified_amount',
        effective_from: '',
        eligible_types: ['sale'],
        notes: '',
      })
      setRates([
        { generation_from: 1, generation_to: 1, rate: 5 },
        { generation_from: 2, generation_to: 2, rate: 3 },
        { generation_from: 3, generation_to: 3, rate: 2 },
      ])
      setShowForm(false)
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Create failed')
    }
  }

  async function activate(plan: Plan) {
    const confirmed = window.confirm(
      `Activate plan ${plan.name} v${plan.version}? The current active plan will be archived.`,
    )
    if (!confirmed) return
    setMessage('')
    try {
      await api.post(`/admin/compensation-plans/${plan.id}/activate`)
      setMessage('Plan activated.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Activation failed')
    }
  }

  function toggleType(type: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      eligible_types: checked
        ? [...current.eligible_types, type]
        : current.eligible_types.filter((value) => value !== type),
    }))
  }

  function updateRate(index: number, patch: Partial<PlanRate>) {
    setRates((current) => current.map((rate, i) => (i === index ? { ...rate, ...patch } : rate)))
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Compensation plans</h1>
          <p className="section-sub">Versioned generation-rate plans. Only one plan can be active; activating archives the previous one.</p>
        </div>
        {hasPermission(user, 'plans.manage') && (
          <button type="button" className="btn btn-accent" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" /> New draft plan
          </button>
        )}
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      {hasPermission(user, 'plans.manage') && showForm && (
        <div id="create-plan" className="mt-4">
          <form onSubmit={createPlan} className="card card-pad space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label" htmlFor="name">Plan name</label>
                <input className="input" id="name" type="text" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <p className="hint">Display name shown on this plan version.</p>
              </div>
              <div>
                <label className="label" htmlFor="commission_base">Commission base</label>
                <select className="input" id="commission_base" required value={form.commission_base} onChange={(e) => setForm({ ...form, commission_base: e.target.value })}>
                  <option value="eligible_verified_amount">Eligible verified amount</option>
                  <option value="gross_verified_amount">Gross verified amount</option>
                </select>
                <p className="hint">Sets which verified amount commissions are calculated from.</p>
              </div>
              <div>
                <label className="label" htmlFor="effective_from">Effective from (optional)</label>
                <input className="input" id="effective_from" type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
                <p className="hint">Date this version may take effect from; leave empty to apply immediately on activation.</p>
              </div>
              <div>
                <label className="label">Eligible transaction types</label>
                <div className="flex gap-4 pt-2 text-sm text-slate-600">
                  {['sale', 'deposit', 'other'].map((type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input type="checkbox" checked={form.eligible_types.includes(type)} onChange={(e) => toggleType(type, e.target.checked)} />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
                <p className="hint">Only checked transaction types count toward commissionable volume.</p>
              </div>
            </div>

            <div>
              <label className="label">Generation rates</label>
              <div className="table-wrap rounded-xl border border-slate-100">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Generation from</th>
                      <th>Generation to</th>
                      <th>Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate, index) => (
                      <tr key={index}>
                        <td>
                          <input className="input" type="number" min={1} max={20} required value={rate.generation_from} onChange={(e) => updateRate(index, { generation_from: Number(e.target.value) })} />
                          <p className="hint">First generation this rate applies to.</p>
                        </td>
                        <td>
                          <input className="input" type="number" min={1} max={20} required value={rate.generation_to} onChange={(e) => updateRate(index, { generation_to: Number(e.target.value) })} />
                          <p className="hint">Last generation this rate applies to.</p>
                        </td>
                        <td>
                          <input className="input" type="number" step={0.01} min={0} max={100} required value={rate.rate} onChange={(e) => updateRate(index, { rate: Number(e.target.value) })} />
                          <p className="hint">Percentage of eligible volume paid to that generation, e.g. 5 for 5%.</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Default rows mirror the published plan (gen 1: 5%, gen 2: 3%, gen 3: 2%). Adjust as needed.</p>
            </div>

            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea className="input" id="notes" rows={2} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <p className="hint">Internal notes shown on the plan preview; not used in calculations.</p>
            </div>

            <button type="submit" className="btn btn-primary">Create draft</button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {plans.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400">No compensation plans yet.</div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-navy-900">{plan.name}</h2>
                    <span className="badge badge-muted">v{plan.version}</span>
                    <span className={`badge ${plan.status === 'active' ? 'badge-success' : plan.status === 'draft' ? 'badge-warn' : 'badge-muted'}`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Base: <span className="font-mono text-xs">{plan.commission_base}</span>
                    {' · '}Types: {(plan.eligible_transaction_types ?? []).join(', ')}
                  </p>
                  <p className="text-xs text-slate-400">
                    Created by {plan.created_by_name || 'system'} ·{' '}
                    {plan.approved_at
                      ? `Approved by ${plan.approved_by_name ?? 'system'} on ${formatDate(plan.approved_at)}`
                      : 'Not yet approved'}
                    {plan.effective_from ? ` · Effective ${formatDate(plan.effective_from)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn btn-outline btn-sm" to={`/admin/plans/${plan.id}/preview`}>
                    <Eye className="h-4 w-4" /> Preview
                  </Link>
                  {plan.status !== 'active' && hasPermission(user, 'plans.approve') && (
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => activate(plan).catch(() => undefined)}>
                      Activate
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...(plan.rates ?? [])]
                  .sort((a, b) => a.generation_from - b.generation_from)
                  .map((rate, index) => (
                    <span key={index} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-navy-900">
                      Gen {rate.generation_from}{rate.generation_to !== rate.generation_from ? `-${rate.generation_to}` : ''}
                      {' → '}{formatRate(rate.rate)}%
                    </span>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
