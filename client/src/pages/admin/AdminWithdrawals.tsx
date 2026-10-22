import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function AdminWithdrawals() {
  usePageTitle('Withdrawals')
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/admin/withdrawals?${params.toString()}`)
      setWithdrawals(res.data)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load withdrawals')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [statusFilter])

  async function resolve(id: number, action: string) {
    setMessage('')
    try {
      await api.post(`/admin/withdrawals/${id}`, { action })
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  return (
    <div className="mt-6 card card-pad">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="withdrawal-search">Search</label>
          <input
            className="input"
            id="withdrawal-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, amount, status"
          />
        </div>
        <div>
          <label className="label" htmlFor="status-filter">Status</label>
          <select className="input" id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={load}>Filter</button>
      </div>
      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Withdrawal requests</h2>
            <p className="text-sm text-slate-500">Approve reserves nothing extra — paying debits the member wallet and records the payout.</p>
          </div>
        </div>
        <div className="table-wrap mt-4">
          {withdrawals.length === 0 ? (
            <div className="card card-pad text-center text-sm text-slate-400">No withdrawal requests match your filter.</div>
          ) : (
            <Table
              head={['Member', 'Reference', 'Amount', 'Method', 'Status', 'Account details', 'Review note', 'Requested', 'Actions']}
              rows={withdrawals.map((w) => [
                w.member_name || '',
                w.reference || '',
                w.amount != null ? w.amount : '',
                w.method || '',
                w.status || '',
                w.account_details ?? '',
                w.review_note || '',
                w.requested_at ? new Date(w.requested_at.replace(' ', 'T')).toLocaleString() : '',
                `${w.status === 'pending' ? 'Approve / Reject' : w.status === 'approved' ? 'Mark paid' : ' — '}`,
              ])}
            />
          )}
        </div>
      </div>
    </div>
  )
}