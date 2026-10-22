import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function AdminWithdrawals() {
  usePageTitle('Withdrawals')
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/admin/withdrawals?${params.toString()}`)
      setWithdrawals(res.data ?? [])
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
      setMessage(`Action ${action} completed.`)
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  return (
    <div>
      <div>
        <h1 className="page-title">Withdrawal requests</h1>
        <p className="section-sub">Approve reserves nothing extra — paying debits the member wallet and records the payout.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); load() }} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" name="status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="paid">paid</option>
            <option value="rejected">rejected</option>
            <option value="reversed">reversed</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="#" className="btn btn-ghost" onClick={e => { e.preventDefault(); setStatusFilter(''); load() }}>Reset</a>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card card-pad">
        <h2 className="font-bold text-navy-900">Withdrawal requests</h2>
        <p className="section-sub">Approve reserves nothing extra — paying debits the member wallet and records the payout.</p>

        {withdrawals.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400">No withdrawal requests match your filter.</div>
        ) : (
          <>
            <div className="table-wrap mt-4">
              <Table
                head={['Member', 'Reference', 'Amount', 'Method', 'Status', 'Account details', 'Review note', 'Requested', 'Actions']}
                rows={withdrawals.map((w: any) => [
                  w.member?.name ?? w.member_name ?? '—',
                  w.reference ?? '—',
                  w.amount != null ? '$' + Number(w.amount).toFixed(2) : '—',
                  w.method ? w.method.replace(/_/g, ' ') : '—',
                  w.status ?? '—',
                  w.account_details ?? '—',
                  w.review_note ?? '—',
                  w.created_at ? new Date(w.created_at.replace(' ', 'T')).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
                  w.status === 'pending' ? 'Approve / Reject' : w.status === 'approved' ? 'Mark paid' : '—',
                ])}
              />
            </div>

            <div className="mt-4 space-y-3">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="card card-pad flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-60 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a className="font-bold text-navy-900 hover:text-accent-600" href="#">{w.member?.name ?? w.member_name ?? '—'}</a>
                      <span className="font-mono text-xs text-slate-400">{w.reference}</span>
                      <span className={`badge ${w.status === 'pending' ? 'badge-warn' : w.status === 'approved' ? 'badge-info' : w.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>{w.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="money font-semibold text-navy-900">${w.amount != null ? Number(w.amount).toFixed(2) : '0.00'}</span>
                      {' via ' + (w.method ? w.method.replace(/_/g, ' ') : '—')}
                    </p>
                    <p className="mt-1 rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-600">{w.account_details ?? '—'}</p>
                    {w.review_note ? <p className="mt-1 text-xs text-slate-400">Review note: {w.review_note}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      Requested {w.created_at ? new Date(w.created_at.replace(' ', 'T')).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      {w.paid_at ? ' · Paid ' + new Date(w.paid_at.replace(' ', 'T')).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {w.status === 'pending' && (
                      <>
                        <button type="button" className="btn btn-accent btn-sm" onClick={() => resolve(w.id, 'approve')}>Approve</button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => { const r = prompt('Rejection reason (required):'); if (r) { api.post(`/admin/withdrawals/${w.id}`, { action: 'reject', reason: r }).then(() => load()).catch(() => undefined) } }}>Reject</button>
                      </>
                    )}
                    {w.status === 'approved' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (confirm(`Mark $${Number(w.amount).toFixed(2)} as paid? This debits the member wallet.`)) resolve(w.id, 'pay') }}>Mark paid</button>
                    )}
                    {w.status !== 'pending' && w.status !== 'approved' && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
