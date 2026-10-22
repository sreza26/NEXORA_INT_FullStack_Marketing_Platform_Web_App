import { useEffect, useState } from 'react'
import { usePageTitle } from '../../lib/usePageTitle'
import { api } from '../../lib/api'
import { Plus } from 'lucide-react'

export default function CompensationPlans() {
  usePageTitle('Compensation Plans')
  const [plans, setPlans] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', commission_base: 'eligible_verified_amount', effective_from: '', eligible_types: ['sale'] as string[], notes: '' })
  const [rates, setRates] = useState([{ generation_from: 1, generation_to: 1, rate: 5 }, { generation_from: 2, generation_to: 2, rate: 3 }, { generation_from: 3, generation_to: 3, rate: 2 }])

  useEffect(() => { api.get('/admin/compensation-plans').then((res) => setPlans(res.data ?? [])).catch(() => undefined) }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await api.post('/admin/compensation-plans', { ...form, rates })
      setMessage('Draft created.')
      setForm({ name: '', commission_base: 'eligible_verified_amount', effective_from: '', eligible_types: ['sale'], notes: '' })
      setShowForm(false)
      api.get('/admin/compensation-plans').then((r) => setPlans(r.data ?? []))
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Create failed')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Compensation plans</h1>
          <p className="section-sub">Versioned generation-rate plans. Only one plan can be active; activating archives the previous one.</p>
        </div>
        <button className="btn btn-accent btn-sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" /> New draft plan
        </button>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      {showForm && (
        <div id="create-plan" className="mt-4 card card-pad space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label" htmlFor="cp-name">Plan name</label>
                <input required id="cp-name" className="input" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <p className="hint">Display name shown on this plan version.</p>
              </div>
              <div>
                <label className="label" htmlFor="cp-base">Commission base</label>
                <select id="cp-base" className="input" value={form.commission_base} onChange={(e) => setForm({ ...form, commission_base: e.target.value })}>
                  <option value="eligible_verified_amount">Eligible verified amount</option>
                  <option value="gross_verified_amount">Gross verified amount</option>
                </select>
                <p className="hint">Sets which verified amount commissions are calculated from.</p>
              </div>
              <div>
                <label className="label" htmlFor="cp-from">Effective from (optional)</label>
                <input id="cp-from" type="date" className="input" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
                <p className="hint">Date this version may take effect from; leave empty to apply immediately on activation.</p>
              </div>
              <div>
                <label className="label">Eligible transaction types</label>
                <div className="flex gap-4 pt-2 text-sm text-slate-600">
                  {['sale', 'deposit', 'other'].map((t) => (
                    <label key={t} className="flex items-center gap-2"><input type="checkbox" checked={form.eligible_types.includes(t)} onChange={(e) => setForm({ ...form, eligible_types: e.target.checked ? [...form.eligible_types, t] : form.eligible_types.filter((x) => x !== t) })} /> {t}</label>
                  ))}
                </div>
                <p className="hint">Only checked transaction types count toward commissionable volume.</p>
              </div>
            </div>

            <div>
              <label className="label">Generation rates</label>
              <div className="table-wrap rounded-xl border border-slate-100">
                <table className="data-table">
                  <thead><tr><th>Generation from</th><th>Generation to</th><th>Rate (%)</th></tr></thead>
                  <tbody>
                    {rates.map((r, i) => (
                      <tr key={i}>
                        <td><input className="input" type="number" min={1} max={20} value={r.generation_from} onChange={(e) => setRates(rates.map((x, j) => j === i ? { ...x, generation_from: Number(e.target.value) } : x))} /></td>
                        <td><input className="input" type="number" min={1} max={20} value={r.generation_to} onChange={(e) => setRates(rates.map((x, j) => j === i ? { ...x, generation_to: Number(e.target.value) } : x))} /></td>
                        <td><input className="input" type="number" step={0.01} min={0} max={100} value={r.rate} onChange={(e) => setRates(rates.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Default rows mirror the published plan (gen 1: 5%, gen 2: 3%, gen 3: 2%). Adjust as needed.</p>
            </div>

            <div>
              <label className="label" htmlFor="cp-notes">Notes</label>
              <textarea id="cp-notes" className="input" rows={2} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <p className="hint">Internal notes shown on the plan preview; not used in calculations.</p>
            </div>

            <button type="submit" className="btn btn-primary">Create draft</button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {plans.map((p) => (
          <div key={p.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-navy-900">{p.name}</h2>
                  <span className="badge badge-muted">v{p.version ?? 1}</span>
                  <span className={`badge ${p.status === 'active' ? 'badge-success' : p.status === 'draft' ? 'badge-warn' : 'badge-muted'}`}>{p.status || 'draft'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Base: <span className="font-mono text-xs">{p.commission_base || '-'}</span> · Types: {(p.eligible_transaction_types ?? p.eligible_types ?? ['sale']).join(', ')}</p>
                <p className="text-xs text-slate-400">Created by {p.created_by_name || 'system'} {p.approved_by_name ? `· Approved by ${p.approved_by_name}` : ''} {p.approved_at ? `· ${new Date(p.approved_at).toLocaleDateString('en-CA',{day:'2-digit',month:'short',year:'numeric'})}` : (p.status === 'draft' ? '· Not yet approved' : '')} {p.effective_from ? `· Effective ${new Date(p.effective_from).toLocaleDateString('en-CA',{day:'2-digit',month:'short',year:'numeric'})}` : ''}</p>
                {Array.isArray(p.rates) && p.rates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.rates.map((rate: any, i: number) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-navy-900">
                        Gen {rate.generation_from}{rate.generation_to !== rate.generation_from ? '-' + rate.generation_to : ''} → {rate.rate}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/admin/plans/${p.id}/preview`} className="btn btn-outline btn-sm">Preview</a>
                {p.status !== 'active' && (
                  <button className="btn btn-accent btn-sm" onClick={async () => { try { await api.post(`/admin/compensation-plans/${p.id}/activate`); setMessage('Plan activated'); api.get('/admin/compensation-plans').then(r=>setPlans(r.data??[])); } catch { setMessage('Activation failed') } }}>Activate</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="card card-pad text-center text-sm text-slate-400">No compensation plans yet.</div>}
      </div>
    </>
  )
}