import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

const emptyForm = { amount: '', method: 'bank', account_details: '' }

interface Withdrawal {
  id: number
  reference?: string
  amount: number
  method: string
  status: string
  created_at?: string
  requested_at?: string
  paid_at?: string
  processed_at?: string
}

export default function Withdrawals() {
  usePageTitle('Withdrawals')
  const [items, setItems] = useState<Withdrawal[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const minAmount = 10

  async function load() {
    const res = await api.get('/member/withdrawals')
    setItems(Array.isArray(res.data) ? res.data : res.data.withdrawals || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.post('/member/withdrawals', {
        amount: Number(form.amount),
        method: form.method,
        account_details: form.account_details,
      })
      setMessage('Withdrawal request submitted for review.')
      setForm(emptyForm)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to submit the request')
    }
  }

  const badgeClass = (s: string) => {
    if (s === 'paid') return 'badge-success'
    if (s === 'approved') return 'badge-info'
    if (s === 'pending') return 'badge-warn'
    if (s === 'reversed' || s === 'rejected') return 'badge-danger'
    return 'badge-muted'
  }

  return (
    <>
      <div>
        <h1 className="page-title">Withdrawals</h1>
        <p className="section-sub">Request a payout from your available balance. Requests are reviewed by finance before payment.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="card card-pad space-y-4 lg:col-span-1">
          <h2 className="font-bold text-navy-900">New withdrawal request</h2>

          <div>
            <label className="label" htmlFor="amount">Amount (USD)</label>
            <input className="input" id="amount" type="number" step="0.01" min={minAmount} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <p className="mt-1 text-[11px] text-slate-400">Minimum ${minAmount.toFixed(2)}. Must not exceed your available balance.</p>
          </div>

          <div>
            <label className="label" htmlFor="method">Payout method</label>
            <select className="input" id="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="bank">Bank transfer</option>
              <option value="mobile_wallet">Mobile wallet</option>
              <option value="crypto">Crypto</option>
            </select>
            <p className="hint">Where the funds will be paid out.</p>
          </div>

          <div>
            <label className="label" htmlFor="account_details">Account details</label>
            <textarea className="input" id="account_details" rows={3} required maxLength={1000} placeholder="Account number / IBAN / wallet address" value={form.account_details} onChange={(e) => setForm({ ...form, account_details: e.target.value })}></textarea>
            <p className="mt-1 text-[11px] text-slate-400">Stored encrypted; only finance staff can view it.</p>
          </div>

          {error && <p className="flash-err">{error}</p>}
          {message && <p className="flash-ok">{message}</p>}

          <button className="btn btn-accent w-full" type="submit">Submit request</button>
        </form>

        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-navy-900">Request history</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-slate-400">No withdrawal requests yet.</td></tr>
                  ) : (
                    items.map((w) => (
                      <tr key={w.id}>
                        <td className="font-mono text-xs">{w.reference || `WD-${w.id}`}</td>
                        <td className="text-right money">{money(Number(w.amount || 0))}</td>
                        <td className="capitalize">{String(w.method).replace(/_/g, ' ')}</td>
                        <td><span className={`badge ${badgeClass(w.status)}`}>{w.status}</span></td>
                        <td className="text-sm text-slate-500">{w.created_at || w.requested_at ? new Date((w.created_at || w.requested_at)!.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                        <td className="text-sm text-slate-500">{w.paid_at || w.processed_at ? new Date((w.paid_at || w.processed_at)!.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
