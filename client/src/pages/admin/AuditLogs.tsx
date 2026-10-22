import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function AuditLogs() {
  usePageTitle('Audit Logs')
  const [items, setItems] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  async function load(p = page) {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (action.trim()) params.set('action', action.trim())
    params.set('page', String(p))
    const res = await api.get(`/admin/audit-logs?${params.toString()}`).catch(() => ({ data: { items: [], totalPages: 1, total: 0, page: 1 } }))
    const data = res.data || {}
    setItems(data.items || [])
    setPage(data.page ?? p)
    setTotalPages(data.totalPages ?? 1)
    setTotal(data.total ?? 0)
  }

  useEffect(() => { load(1) }, [])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    load(1)
  }

  return (
    <>
      <div>
        <h1 className="page-title">Audit trail</h1>
        <p className="section-sub">Who did what, when — including sponsor corrections, verifications and financial actions.</p>
      </div>

      <form onSubmit={handleFilter} className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input className="input" type="search" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Action or model type" />
        </div>
        <div>
          <label className="label" htmlFor="action">Action prefix</label>
          <input className="input" type="text" id="action" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. verification, transaction, roles" />
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="#" onClick={(e) => { e.preventDefault(); setQ(''); setAction(''); load(1) }} className="btn btn-ghost">Reset</a>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Matches actions starting with this text, e.g. verification.</p>
      </form>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400">No audit entries match your filters.</div>
        ) : (
          items.map((log: any) => (
            <div key={log.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-navy-900">{log.action || '—'}</span>
                    <span className="text-xs text-slate-400">
                      {log.auditable_type ? log.auditable_type.replace(/.*\//, '') : '—'}{log.auditable_id ? ' #' + log.auditable_id : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {log.user_name || 'system'} · {log.ip_address || '—'} · {log.created_at ? new Date(String(log.created_at).replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>
              {(log.old_values && Object.keys(log.old_values).length > 0) || (log.new_values && Object.keys(log.new_values).length > 0) ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {log.old_values && Object.keys(log.old_values).length > 0 && (
                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-red-500 text-[11px] font-bold">Before</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-red-800">{JSON.stringify(log.old_values, null, 2)}</pre>
                    </div>
                  )}
                  {log.new_values && Object.keys(log.new_values).length > 0 && (
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-emerald-600 text-[11px] font-bold">After</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-emerald-800">{JSON.stringify(log.new_values, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {page > 1 && <button className="btn btn-ghost btn-sm" onClick={() => load(page - 1)}>Previous</button>}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => load(p)}>{p}</button>
        ))}
        {page < totalPages && <button className="btn btn-ghost btn-sm" onClick={() => load(page + 1)}>Next</button>}
      </div>
      <div className="mt-2 text-xs text-slate-400 text-center">Page {page} of {totalPages} · {total} total</div>
    </>
  )
}