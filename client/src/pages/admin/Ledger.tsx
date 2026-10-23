import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface LedgerRow {
  id: number
  member_id: number
  type: string
  direction: string
  amount: number
  balance_after: number
  reference_type: string | null
  reference_id: number | null
  description: string | null
  status: string
  created_at: string | null
  member_name: string | null
  member_code: string | null
}

interface LedgerResponse {
  items: LedgerRow[]
  total: number
  types: string[]
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  commission: 'Commission',
  salary: 'Salary',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
  reversal: 'Reversal',
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

function statusBadge(status: string): string {
  if (status === 'completed' || status === 'approved') return 'badge-success'
  if (status === 'pending') return 'badge-warn'
  if (status === 'reversed') return 'badge-danger'
  return 'badge-muted'
}

export default function Ledger() {
  usePageTitle('Ledger')
  const [items, setItems] = useState<LedgerRow[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  async function load() {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (typeFilter) params.set('type', typeFilter)
    const res = await api.get(`/admin/ledger?${params.toString()}`)
    const data = res.data as LedgerResponse
    setItems(data.items ?? [])
    setTypes(data.types ?? [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  return (
    <>
      <div>
        <h1 className="page-title">Immutable ledger</h1>
        <p className="section-sub">Append-only double-entry style records. Completed entries can never be edited — corrections appear as reversal entries.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load().catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input className="input" type="search" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference or member" />
        </div>
        <div>
          <label className="label" htmlFor="type">Entry type</label>
          <select className="input" id="type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {types.map((entryType) => (
              <option key={entryType} value={entryType}>{TYPE_LABELS[entryType] ?? entryType}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <Link to="/admin/ledger" className="btn btn-ghost" onClick={() => { setQ(''); setTypeFilter('') }}>Reset</Link>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Entries of this type only.</p>
      </form>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Member</th>
                <th>Type</th>
                <th>Direction</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance after</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-400">No ledger entries match your filters.</td></tr>
              ) : (
                items.map((entry) => {
                  const reference = entry.reference_type
                    ? `${entry.reference_type}${entry.reference_id ? ` #${entry.reference_id}` : ''}`
                    : '—'
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="font-mono text-xs">{reference}</span>
                        {entry.description && <p className="text-[11px] text-slate-400">{entry.description}</p>}
                      </td>
                      <td>
                        <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${entry.member_id}`}>
                          {entry.member_name ?? '—'}
                        </Link>
                        <p className="font-mono text-[11px] text-slate-400">{entry.member_code}</p>
                      </td>
                      <td className="text-sm">{entry.type.replace(/_/g, ' ')}</td>
                      <td>
                        <span className={`badge ${entry.direction === 'credit' ? 'badge-success' : 'badge-danger'}`}>{entry.direction}</span>
                      </td>
                      <td className={`text-right money font-semibold ${entry.direction === 'debit' ? 'text-red-600' : ''}`}>
                        {entry.direction === 'debit' ? '-' : '+'}${Number(entry.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right text-sm tabular-nums">${Number(entry.balance_after ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><span className={`badge ${statusBadge(entry.status)}`}>{entry.status}</span></td>
                      <td className="text-sm text-slate-500">{formatDate(entry.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
