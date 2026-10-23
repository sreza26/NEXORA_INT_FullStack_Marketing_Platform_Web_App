import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import PlanPreview from './plans/Preview'

interface PreviewRecipient {
  generation: number
  ancestor_name: string | null
  eligible: boolean
  rate: number
  amount: number
}

interface PreviewTransaction {
  reference: string
  member_name: string | null
  status: string
}

interface PreviewPlan {
  name: string
  version: number
}

interface PreviewResult {
  transaction: PreviewTransaction | null
  preview: {
    base: number
    plan: PreviewPlan | null
    recipients: PreviewRecipient[]
  } | null
}

function formatRate(rate: number): string {
  return Number(rate).toFixed(2).replace(/\.?0+$/, '')
}

function CommissionPreviewForm() {
  usePageTitle('Commission Preview')
  const [reference, setReference] = useState('')
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [message, setMessage] = useState('')

  async function run(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    try {
      const res = await api.get(`/admin/commissions/preview?reference=${encodeURIComponent(reference)}`)
      setResult(res.data as PreviewResult)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Preview failed')
    }
  }

  const transaction = result?.transaction ?? null
  const preview = result?.preview ?? null

  return (
    <>
      <div>
        <h1 className="page-title">Commission engine preview</h1>
        <p className="section-sub">Dry-run the generation commission calculation for any recorded transaction. Nothing is written.</p>
      </div>

      <form onSubmit={run} className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="reference">Transaction reference</label>
          <input
            className="input"
            type="text"
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="TXN-..."
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Run preview</button>
        <p className="hint w-full">Dry-runs the commission split for this recorded transaction.</p>
      </form>

      {message && <p className="flash-err mt-4">{message}</p>}

      {reference && result && !transaction && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          No transaction matches that reference.
        </div>
      )}

      {transaction && preview && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Transaction</span>
              <span className="stat-value text-lg font-mono">{transaction.reference}</span>
              <span className="text-xs text-slate-400">{transaction.member_name} · {transaction.status}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Commission base</span>
              <span className="stat-value money">${Number(preview.base).toFixed(2)}</span>
              <span className="text-xs text-slate-400">after plan base rules</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Active plan</span>
              <span className="stat-value text-lg">{preview.plan?.name ?? 'None'}</span>
              <span className="text-xs text-slate-400">
                {preview.plan ? `v${preview.plan.version}` : 'no active plan — nothing would be generated'}
              </span>
            </div>
          </div>

          <div className="mt-6 card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-navy-900">Would-be recipients</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Generation</th>
                    <th>Recipient</th>
                    <th>Active</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.recipients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-400">No recipients — base is zero or no ancestor matches a configured rate.</td>
                    </tr>
                  ) : (
                    preview.recipients.map((row, index) => (
                      <tr key={index}>
                        <td>Gen {row.generation}</td>
                        <td className="font-semibold text-navy-900">{row.ancestor_name ?? '—'}</td>
                        <td>
                          <span className={`badge ${row.eligible ? 'badge-success' : 'badge-muted'}`}>
                            {row.eligible ? 'active' : 'inactive'}
                          </span>
                        </td>
                        <td className="text-right text-sm">{formatRate(row.rate)}%</td>
                        <td className="text-right money font-semibold">${Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function CommissionPreview() {
  const { id } = useParams<{ id: string }>()
  if (id) return <PlanPreview />
  return <CommissionPreviewForm />
}
