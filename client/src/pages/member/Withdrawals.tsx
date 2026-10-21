import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Table } from '../../components/Shell'

const emptyForm = { amount: '', method: 'bank', account_details: '' }

export default function Withdrawals() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await api.get('/member/withdrawals')
    setItems(res.data)
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

  return (
    <>
      <form className="card" style={{ marginBottom: '2rem' }} onSubmit={submit}>
        <header className="card-header">
          <div>
            <h3>Request a withdrawal</h3>
            <p style={{ color: 'var(--text-muted)' }}>Funds are held until finance approves the request</p>
          </div>
        </header>
        <div className="card-body">
          <label className="label">
            Amount
            <input className="input" type="number" min="1" step="0.01" required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="label">
            Method
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="bank">Bank transfer</option>
              <option value="mobile">Mobile wallet</option>
              <option value="crypto">Crypto</option>
            </select>
          </label>
          <label className="label">
            Account details
            <input className="input" required value={form.account_details}
              onChange={(e) => setForm({ ...form, account_details: e.target.value })} />
          </label>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          {message && <p style={{ color: 'var(--success)' }}>{message}</p>}
          <button className="btn btn-primary" type="submit">Submit request</button>
        </div>
      </form>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Your requests</h3>
            <p style={{ color: 'var(--text-muted)' }}>History of every withdrawal you submitted</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Amount', 'Method', 'Status', 'Requested', 'Processed']}
            rows={items.map((w) => [
              money(w.amount),
              w.method,
              w.status,
              new Date(w.requested_at.replace(' ', 'T')).toLocaleDateString(),
              w.processed_at ? new Date(w.processed_at.replace(' ', 'T')).toLocaleDateString() : '—',
            ])}
          />
        </div>
      </div>
    </>
  )
}
