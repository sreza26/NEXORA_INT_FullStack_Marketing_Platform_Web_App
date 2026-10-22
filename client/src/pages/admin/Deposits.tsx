import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../lib/auth'

function formatStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'badge-warn',
    verified: 'badge-success',
    rejected: 'badge-danger',
  }
  return map[status] ?? 'badge-muted'
}

function formatMethod(method: string) {
  return method ? method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
}

export default function Deposits() {
  usePageTitle('Deposits')
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/admin/deposits?${params.toString()}`)
      setData(res.data ?? null)
      setMessage('')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load deposits')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [statusFilter])

  async function verify(id: number) {
    setMessage('')
    try {
      await api.post(`/admin/deposits/${id}/verify`)
      setMessage('Deposit verified.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Verify failed')
    }
  }

  async function reject(id: number) {
    const reason = window.prompt('Rejection reason (required):')
    if (!reason) return
    setMessage('')
    try {
      await api.post(`/admin/deposits/${id}/reject`, { reason })
      setMessage('Deposit rejected.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Reject failed')
    }
  }

  function handleReset() {
    if (statusFilter) {
      // The effect reloads once the filter is cleared.
      setStatusFilter('')
    } else {
      load()
    }
  }

  const items = data?.items ?? []
  const statuses = data?.statuses ?? ['pending', 'verified', 'rejected']

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Deposit records</h1>
          <p className="section-sub">Deposits are capital — informational only, never commissionable.</p>
        </div>
        {!data?.policyEnabled && (
          <span className="badge badge-warn">
            Deposit policy disabled ({data?.holdDays ?? '--'}-day hold under legal review)
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); load() }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select
            className="input"
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="#" onClick={(e) => { e.preventDefault(); handleReset() }} className="btn btn-ghost">Reset</a>
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
                <th className="text-right">Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Hold until</th>
                <th>Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400">
                    No deposit records match your filter.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-mono text-xs">{item.reference}</span>
                      {item.notes ? <p className="text-[11px] text-slate-400">{item.notes}</p> : null}
                    </td>
                    <td>
                      <a
                        className="font-semibold text-navy-900 hover:text-accent-600"
                        href={`/admin/members/${item.member_id ?? ''}`}
                      >
                        {item.member_name ?? '—'}
                      </a>
                      <p className="font-mono text-[11px] text-slate-400">{item.member_code ?? '—'}</p>
                    </td>
                    <td className="text-right money font-semibold">
                      {item.amount != null
                        ? '$' + Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : ''}
                    </td>
                    <td className="text-sm capitalize">{formatMethod(item.method)}</td>
                    <td>
                      <span className={`badge ${formatStatusBadge(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="text-sm text-slate-500">
                      {item.hold_until ? new Date(item.hold_until.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="text-sm text-slate-500">
                      {item.created_at ? new Date(item.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="text-right">
                      {item.status === 'pending' ? (
                        hasPermission(user, 'deposits.verify') ? (
                          <>
                            <form className="inline" onSubmit={(e) => { e.preventDefault(); verify(item.id) }}>
                              <button type="submit" className="btn btn-accent btn-sm">Verify</button>
                            </form>
                            <form
                              className="inline"
                              onSubmit={(e) => { e.preventDefault(); reject(item.id) }}
                            >
                              <button type="submit" className="btn btn-outline btn-sm">Reject</button>
                            </form>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )
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
    </>
  )
}
