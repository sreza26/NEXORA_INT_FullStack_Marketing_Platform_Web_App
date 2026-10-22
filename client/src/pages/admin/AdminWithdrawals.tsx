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
      <div className="mt-6 card card-pad">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <div>
            <label className="label" htmlFor="withdrawal-status">Status</label>
            <select
              className="input"
              id="withdrawal-status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Withdrawal requests</h2>
            <p className="text-sm text-slate-500">Approve to release funds, reject to refund the member</p>
          </div>
        </div>
        <div className="table-wrap mt-4">
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
        </div>
        <div className="mt-4 grid gap-2">
          {items
            .filter((w) => w.status === 'pending')
            .map((w) => (
              <div key={w.id} className="flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => resolve(w.id, 'approve')}>Approve #{w.id}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => resolve(w.id, 'reject')}>Reject #{w.id}</button>
              </div>
            ))}
        </div>
      </div>
    </>
  )
}
