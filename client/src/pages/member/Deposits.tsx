import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { ShieldAlert } from 'lucide-react'

interface Deposit {
  id: number
  reference: string
  amount: number
  method: string
  status: string
  hold_until?: string
  created_at?: string
}

export default function Deposits() {
  usePageTitle('Deposits')
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [policyEnabled, setPolicyEnabled] = useState(true)
  const [holdDays] = useState(30)
  const [form, setForm] = useState({ amount: '', method: 'bank_transfer', reference: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await api.get('/member/deposits')
      setDeposits(res.data.deposits || [])
      setPolicyEnabled(res.data.policyEnabled !== false)
    } catch {
      setDeposits([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.post('/member/deposits', { amount: Number(form.amount), method: form.method, reference: form.reference || undefined })
      setMessage('Deposit recorded and awaiting verification.')
      setForm({ amount: '', method: 'bank_transfer', reference: '' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to submit deposit')
    }
  }

  const badgeClass = (s: string) => {
    if (s === 'verified') return 'badge-success'
    if (s === 'pending') return 'badge-warn'
    if (s === 'rejected') return 'badge-danger'
    return 'badge-muted'
  }

  return (
    <>
      <div>
        <h1 className="page-title">Deposits</h1>
        <p className="section-sub">Record deposits for review. Deposits are capital — they never count as commissionable sales.</p>
      </div>

      {!policyEnabled ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Deposit submissions are temporarily disabled.</strong> The {holdDays}-day deposit policy is under legal review. Existing deposit history is shown below.</span>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 card card-pad max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="amount">Amount (USD)</label>
              <input className="input" type="number" step="0.01" min="1" id="amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <p className="hint">Enter the exact amount you sent, in USD.</p>
            </div>
            <div>
              <label className="label" htmlFor="method">Method</label>
              <select className="input" id="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="mobile_wallet">Mobile wallet</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
              <p className="hint">How you sent the funds — used to match your payment.</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="reference">Payment reference (optional)</label>
            <input className="input" type="text" id="reference" maxLength={64} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <p className="hint">Bank or wallet transaction ID from your payment confirmation.</p>
          </div>
          {error && <p className="flash-err">{error}</p>}
          {message && <p className="flash-ok">{message}</p>}
          <button type="submit" className="btn btn-accent">Submit deposit</button>
          <p className="text-xs text-slate-400">Deposits are held for {holdDays} days and must be verified by finance before becoming withdrawable.</p>
        </form>
      )}

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th className="text-right">Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Hold until</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-400">No deposits recorded.</td></tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.reference}</td>
                    <td className="text-right money">{money(Number(d.amount || 0))}</td>
                    <td className="capitalize">{String(d.method).replace(/_/g, ' ')}</td>
                    <td><span className={`badge ${badgeClass(d.status)}`}>{d.status}</span></td>
                    <td className="text-sm text-slate-500">{d.hold_until ? new Date(d.hold_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="text-sm text-slate-500">{d.created_at ? new Date(d.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
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
