import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function Ledger() {
  usePageTitle('Ledger')
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [types, setTypes] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  async function load() {
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (typeFilter) params.set('type', typeFilter)
      const res = await api.get(`/admin/ledger?${params.toString()}`)
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setTypes(res.data?.types ?? [])
    } catch {
      // fail silently
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <div>
        <h1 className="page-title">Immutable ledger</h1>
        <p className="section-sub">Append-only double-entry style records. Completed entries can never be edited — corrections appear as reversal entries.</p>
      </div>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); load() }}
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
          <label className="label" htmlFor="type">Entry type</label>
          <select
            className="input"
            id="type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="#" onClick={(e) => { e.preventDefault(); setQ(''); setTypeFilter(''); load() }} className="btn btn-ghost">Reset</a>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Entries of this type only.</p>
      </form>

      <div className="mt-6 card card-pad">
        <div className="table-wrap">
          {items.length === 0 ? (
            <div className="text-center text-sm text-slate-400">No ledger entries match your filters.</div>
          ) : (
            <Table
              align={['left', 'left', 'left', 'left', 'right', 'right', 'left', 'left']}
              head={[
                'Reference',
                'Member',
                'Type',
                'Direction',
                'Amount',
                'Balance after',
                'Status',
                'Created',
              ]}
              rows={items.map((i) => {
                const ref = i.reference ? String(i.reference) : (i.reference_type && i.reference_id ? `${i.reference_type} #${i.reference_id}` : '')
                const memo = i.memo ? String(i.memo) : (i.description ? String(i.description) : '')
                const memberName = i.member_name || i.member?.name || '—'
                const memberCode = i.member?.member_code || i.member_code || ''
                const typeStr = i.type ? String(i.type).replace(/_/g, ' ') : ''
                const direction = i.direction ? String(i.direction) : ''
                const amountNum = Number(i.amount ?? 0)
                const amountStr = (direction === 'debit' ? '-' : '+') + '$' + amountNum.toFixed(2)
                const balanceNum = Number(i.balance_after ?? 0)
                const balanceStr = '$' + balanceNum.toFixed(2)
                const statusStr = i.status ? String(i.status) : 'pending'
                const createdStr = i.created_at
                  ? new Date(i.created_at.replace(' ', 'T')).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
                return [
                  <span key="ref">
                    <span className="font-mono text-xs">{ref}</span>
                    {memo ? <p className="text-[11px] text-slate-400">{memo}</p> : null}
                  </span>,
                  <span key="member">
                    <a className="font-semibold text-navy-900 hover:text-accent-600" href="#">
                      {memberName}
                    </a>
                    {memberCode ? <p className="font-mono text-[11px] text-slate-400">{memberCode}</p> : null}
                  </span>,
                  <span key="type" className="text-sm">{typeStr}</span>,
                  <span key="dir" className={`badge ${direction === 'credit' ? 'badge-success' : 'badge-danger'}`}>{direction}</span>,
                  <span key="amount" className={`money font-semibold ${direction === 'debit' ? 'text-red-600' : ''}`}>{amountStr}</span>,
                  <span key="bal" className="text-sm tabular-nums">{balanceStr}</span>,
                  <span key="status" className={`badge ${statusStr === 'completed' ? 'badge-success' : statusStr === 'pending' ? 'badge-warn' : statusStr === 'reversed' ? 'badge-danger' : 'badge-muted'}`}>{statusStr}</span>,
                  <span key="created" className="text-sm text-slate-500">{createdStr}</span>,
                ]
              })}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{total} total</span>
      </div>
    </>
  )
}
