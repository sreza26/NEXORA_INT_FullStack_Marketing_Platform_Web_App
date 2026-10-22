import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Calculator, TriangleAlert } from 'lucide-react'

export default function Commissions() {
  usePageTitle('Commissions')
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [statuses, setStatuses] = useState<string[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [message, setMessage] = useState('')

  async function load(p = page) {
    setMessage('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (status) params.set('status', status)
      params.set('page', String(p))
      params.set('perPage', '25')
      const res = await api.get(`/admin/commissions?${params.toString()}`)
      setItems(res.data.items ?? [])
      setStatuses(res.data.statuses ?? [])
      setPage(res.data.page ?? p)
      setTotalPages(res.data.totalPages ?? 1)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load commissions')
    }
  }

  useEffect(() => {
    load(1)
  }, [search, status])

  async function approve(id: number) {
    setMessage('')
    try {
      await api.post(`/admin/commissions/${id}/approve`)
      await load(page)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Approve failed')
    }
  }

  async function reject(id: number) {
    const reason = prompt('Rejection reason (required):')
    if (!reason) return
    setMessage('')
    try {
      await api.post(`/admin/commissions/${id}/reject`, { reason })
      await load(page)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Reject failed')
    }
  }

  async function pay(id: number) {
    setMessage('')
    try {
      await api.post(`/admin/commissions/${id}/pay`)
      await load(page)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Mark paid failed')
    }
  }

  function fmtRate(r: number) {
    let s = Number(r ?? 0).toFixed(2)
    while (s.includes('.') && (s.endsWith('0') || s.endsWith('.'))) {
      s = s.slice(0, -1)
    }
    return s + '%'
  }

  function fmtAmount(a: number) {
    const absVal = Math.abs(Number(a ?? 0))
    const formatted = absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `$${formatted}${Number(a ?? 0) < 0 ? ' <span class="text-xs text-red-500">(rev)</span>' : ''}`
  }

  function badgeClass(s: string) {
    if (s === 'pending') return 'badge-warn'
    if (s === 'approved') return 'badge-info'
    if (s === 'paid') return 'badge-success'
    if (s === 'rejected' || s === 'reversed') return 'badge-danger'
    return 'badge-muted'
  }

  const statusOptions = ['pending', 'approved', 'paid', 'rejected', 'reversed']

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Commissions</h1>
          <p className="section-sub">Approve, pay or reject generation commissions. Approving credits the member wallet.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-outline btn-sm" href="/admin/commissions/preview">
            <Calculator className="h-4 w-4" /> Preview engine
          </a>
          <a className="btn btn-outline btn-sm" href="/admin/commissions/exceptions">
            <TriangleAlert className="h-4 w-4" /> Exceptions
          </a>
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
            type="search"
            id="q"
            name="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recipient or idempotency key"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {(statuses || []).filter((s) => !statusOptions.includes(s)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="/admin/commissions" className="btn btn-ghost">Reset</a>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Generation</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amount</th>
                <th>Source transaction</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-400">No commissions match your filters.</td></tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <a className="font-semibold text-navy-900 hover:text-accent-600" href={`/admin/members/${i.recipient_id}`}>{i.recipient_name || '—'}</a>
                      <p className="font-mono text-[11px] text-slate-400">{i.recipient_code || '—'}</p>
                    </td>
                    <td className="text-sm">Gen {i.generation}</td>
                    <td className="text-right text-sm">{fmtRate(i.rate)}</td>
                    <td className="text-right money font-semibold" dangerouslySetInnerHTML={{ __html: fmtAmount(i.amount) }} />
                    <td>
                      <span className="font-mono text-xs">{i.source_reference || '—'}</span>
                      <p className="text-[11px] text-slate-400">{i.source_member_name || '—'}</p>
                    </td>
                    <td><span className={`badge ${badgeClass(i.status)}`}>{i.status}</span></td>
                    <td className="text-sm text-slate-500">
                      {i.created_at ? new Date(i.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="text-right">
                      {i.status === 'pending' ? (
                        <>
                          <button type="button" className="btn btn-accent btn-sm" onClick={() => approve(i.id)} style={{ marginRight: 4 }}>Approve</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => reject(i.id)}>Reject</button>
                        </>
                      ) : i.status === 'approved' ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => pay(i.id)}>Mark paid</button>
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
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {page > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setPage(page - 1); load(page - 1) }}>Previous</button>
          )}
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setPage(p); load(p) }}
            >
              {p}
            </button>
          ))}
          {page < totalPages && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setPage(page + 1); load(page + 1) }}>Next</button>
          )}
        </div>
      </div>
    </>
  )
}
