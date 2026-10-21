import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Table } from '../../components/Shell'

export default function AdminWithdrawals() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [message, setMessage] = useState('')

  async function load(status = filter) {
    const res = await api.get(`/admin/withdrawals${status ? `?status=${status}` : ''}`)
    setItems(res.data)
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [filter])

  async function resolve(id: number, action: 'approve' | 'reject') {
    setMessage('')
    try {
      await api.post(`/admin/withdrawals/${id}`, { action })
      setMessage(`Withdrawal #${id} ${action}d.`)
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Action failed')
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'end' }}>
          <label className="label">
            Status
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </label>
        </div>
      </div>

      {message && <p style={{ color: 'var(--warning)', marginBottom: '1rem' }}>{message}</p>}

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Withdrawal requests</h3>
            <p style={{ color: 'var(--text-muted)' }}>Approve to release funds, reject to refund the member</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['ID', 'Member', 'Amount', 'Method', 'Status', 'Requested']}
            rows={items.map((w) => [
              w.id,
              `${w.member_name} (${w.member_code})`,
              money(w.amount),
              w.method,
              w.status,
              new Date(w.requested_at.replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>
            {items
              .filter((w) => w.status === 'pending')
              .map((w) => (
                <div key={w.id} style={{ display: 'flex', gap: '0.6rem' }}>
                  <button className="btn btn-primary" onClick={() => resolve(w.id, 'approve')}>Approve #{w.id}</button>
                  <button className="btn btn-ghost" onClick={() => resolve(w.id, 'reject')}>Reject #{w.id}</button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
