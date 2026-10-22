import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table, Stat } from '../../components/Shell'

export default function Salary() {
  usePageTitle('Salary')
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [periods, setPeriods] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [period, setPeriod] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const params = new URLSearchParams()
      if (period.trim()) params.set('period', period.trim())
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/admin/salary?${params.toString()}`)
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setPeriods(res.data?.periods ?? [])
      setStatuses(res.data?.statuses ?? [])
      setMessage('')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load salary')
    }
  }

  useEffect(() => { load().catch(() => undefined) }, [])

  async function generate() {
    setMessage('')
    try {
      const res = await api.post('/admin/salary/generate', { period: period.trim() || new Date().toISOString().slice(0, 7) })
      setMessage(`Generated ${res.data?.created ?? 0} entries.`)
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Generate failed')
    }
  }

  async function approve(id: number) {
    setMessage('')
    try {
      await api.post(`/admin/salary/${id}/approve`)
      await load()
      setMessage('Approved.')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Approve failed')
    }
  }

  async function reject(id: number) {
    const reason = prompt('Rejection reason (optional):')
    setMessage('')
    try {
      await api.post(`/admin/salary/${id}/reject`, { reason: reason || null })
      await load()
      setMessage('Rejected.')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Reject failed')
    }
  }

  async function pay(id: number) {
    setMessage('')
    try {
      await api.post(`/admin/salary/${id}/pay`)
      await load()
      setMessage('Paid.')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Pay failed')
    }
  }

  const pendingCount = items.filter((i) => i.status === 'pending').length
  const paidCount = items.filter((i) => i.status === 'paid').length
  const approvedCount = items.filter((i) => i.status === 'approved').length

  return (
    <>
      <h1 className="page-title">Monthly salary payouts</h1>
      <p className="section-sub">Generate a period, then approve, pay or reject each payout. Paying credits the member wallet.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Total payouts" value={total} />
        <Stat label="Pending" value={pendingCount} />
        <Stat label="Approved" value={approvedCount} />
        <Stat label="Paid" value={paidCount} />
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); load() }}
      >
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="period">Period (YYYY-MM)</label>
          <input
            id="period"
            className="input"
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-01"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={generate}>Generate</button>
        <button type="submit" className="btn btn-secondary">Filter</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setPeriod(''); setStatusFilter(''); load() }}>Reset</button>
      </form>
      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card card-pad">
        <div className="table-wrap">
          <Table
            head={['Member', 'Rank', 'Period', 'Amount', 'Status', 'Created', 'Actions']}
            rows={items.map((i) => [
              <div key="m">
                <div className="font-semibold">{i.member_name || '—'}</div>
                <div className="font-mono text-[11px] text-slate-400">{i.member_code || '—'}</div>
              </div>,
              i.rank_name || '—',
              i.period || '—',
              <span key="amt" className="font-medium">{money(i.amount)}</span>,
              <span key="st" className={`badge ${i.status === 'pending' ? 'badge-warn' : i.status === 'approved' ? 'badge-info' : i.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>{i.status}</span>,
              i.created_at ? new Date(i.created_at.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
              <div key="act" className="flex gap-1 flex-wrap">
                {i.status === 'pending' && (
                  <>
                    <button className="btn btn-primary btn-xs" onClick={() => approve(i.id)}>Approve</button>
                    <button className="btn btn-outline btn-xs" onClick={() => reject(i.id)}>Reject</button>
                  </>
                )}
                {i.status === 'approved' && (
                  <button className="btn btn-success btn-xs" onClick={() => pay(i.id)}>Pay</button>
                )}
                {i.status !== 'pending' && i.status !== 'approved' && <span className="text-xs text-slate-400">—</span>}
              </div>,
            ])}
          />
        </div>
      </div>
    </>
  )
}
