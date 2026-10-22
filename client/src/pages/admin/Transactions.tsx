import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Transactions() {
  usePageTitle('Transactions')
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [statuses, setStatuses] = useState<string[]>([])

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load(p = 1) {
    setMessage('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('perPage', String(perPage))
      if (q.trim()) params.set('q', q.trim())
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/admin/transactions?${params.toString()}`)
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setPage(res.data?.page ?? 1)
      setPerPage(res.data?.perPage ?? 25)
      setTotalPages(res.data?.totalPages ?? 1)
      setStatuses(res.data?.statuses ?? [])
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load transactions')
    }
  }

  useEffect(() => {
    load(1).catch(() => undefined)
  }, [])

  async function action(id: number, endpoint: string, body?: Record<string, unknown>) {
    setMessage('')
    try {
      await api.post(`/admin/transactions/${id}/${endpoint}`, body ?? {})
      setMessage('Updated.')
      await load(page)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Action failed')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Business transactions</h1>
          <p className="section-sub">Record, verify and reverse transactions. Only verified volume feeds commissions.</p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); load(1) }}
      >
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input
            className="input"
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reference or member"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select
            className="input"
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => { setQ(''); setStatusFilter(''); load(1) }}
        >
          Reset
        </button>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Member</th>
                <th>Type</th>
                <th className="text-right">Gross</th>
                <th className="text-right">Eligible</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400">No transactions match your filters.</td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className="font-mono text-xs">{i.reference}</span>
                      {i.description && <p className="text-[11px] text-slate-400">{i.description}</p>}
                    </td>
                    <td>
                      <span className="font-semibold text-navy-900">{i.member_name || '—'}</span>
                      <p className="font-mono text-[11px] text-slate-400">{i.member_code || ''}</p>
                    </td>
                    <td className="text-sm capitalize">{i.type || ''}</td>
                    <td className="text-right money">${Number(i.gross_amount ?? 0).toFixed(2)}</td>
                    <td className="text-right money">${Number(i.eligible_amount ?? 0).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${
                        i.status === 'pending' ? 'badge-warn' :
                        i.status === 'verified' || i.status === 'approved' ? 'badge-success' :
                        i.status === 'rejected' || i.status === 'refunded' ? 'badge-danger' : 'badge-muted'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="text-sm text-slate-500">{i.created_at ? new Date(i.created_at.replace(' ', 'T')).toLocaleDateString() : '—'}</td>
                    <td className="text-right">
                      {i.status === 'pending' ? (
                        <>
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => action(i.id, 'verify', { eligible_amount: i.eligible_amount ?? i.gross_amount })}
                          >
                            Verify
                          </button>
                          <button
                            className="btn btn-outline btn-sm ml-1"
                            onClick={() => {
                              const r = window.prompt('Rejection reason:')
                              if (r === null) return
                              action(i.id, 'reject', { reason: r })
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : i.status === 'verified' || i.status === 'approved' ? (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const r = window.prompt('Reason for reversal (required):')
                            if (!r) return
                            action(i.id, 'reverse', { reason: r })
                          }}
                        >
                          Reverse
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{total} total</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</button>
        </div>
      </div>
    </>
  )
}
