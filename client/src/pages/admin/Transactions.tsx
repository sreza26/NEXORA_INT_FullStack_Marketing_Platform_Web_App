import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../lib/auth'

interface TransactionRow {
  id: number
  member_id: number
  reference: string
  gross_amount: number
  eligible_amount: number
  type: string
  description: string | null
  status: string
  created_at: string | null
  member_name: string | null
  member_code: string | null
}

interface TransactionsResponse {
  items: TransactionRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadge(status: string): string {
  if (status === 'pending') return 'badge-warn'
  if (status === 'verified' || status === 'approved') return 'badge-success'
  if (status === 'rejected' || status === 'refunded') return 'badge-danger'
  return 'badge-muted'
}

export default function Transactions() {
  usePageTitle('Transactions')
  const { user } = useAuth()
  const [items, setItems] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState('')
  const [createForm, setCreateForm] = useState({
    member_code: '',
    type: 'sale',
    gross_amount: '',
    eligible_amount: '',
    description: '',
  })

  async function load(pageNumber = 1) {
    const params = new URLSearchParams()
    params.set('page', String(pageNumber))
    params.set('perPage', String(perPage))
    if (q.trim()) params.set('q', q.trim())
    if (statusFilter) params.set('status', statusFilter)
    const res = await api.get(`/admin/transactions?${params.toString()}`)
    const data = res.data as TransactionsResponse
    setItems(data.items ?? [])
    setTotal(data.total ?? 0)
    setPage(data.page ?? 1)
    setPerPage(data.perPage ?? 25)
    setTotalPages(data.totalPages ?? 1)
  }

  useEffect(() => {
    load(1).catch(() => undefined)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await api.post('/admin/transactions', {
        member_code: createForm.member_code,
        type: createForm.type,
        gross_amount: createForm.gross_amount,
        eligible_amount: createForm.eligible_amount || createForm.gross_amount,
        description: createForm.description || null,
      })
      setCreateForm({ member_code: '', type: 'sale', gross_amount: '', eligible_amount: '', description: '' })
      setShowCreate(false)
      await load(1)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setMessage(error.response?.data?.message ?? 'Failed to record transaction')
    }
  }

  async function verify(id: number, eligible: number) {
    setMessage('')
    try {
      await api.post(`/admin/transactions/${id}/verify`, { eligible_amount: eligible })
      await load(page)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setMessage(error.response?.data?.message ?? 'Action failed')
    }
  }

  async function reject(id: number) {
    const reason = window.prompt('Rejection reason:')
    if (reason === null) return
    setMessage('')
    try {
      await api.post(`/admin/transactions/${id}/reject`, { reason })
      await load(page)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setMessage(error.response?.data?.message ?? 'Action failed')
    }
  }

  async function reverse(id: number) {
    const reason = window.prompt('Reason for reversal (required):')
    if (!reason) return
    setMessage('')
    try {
      await api.post(`/admin/transactions/${id}/reverse`, { reason })
      await load(page)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setMessage(error.response?.data?.message ?? 'Action failed')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Business transactions</h1>
          <p className="section-sub">Record, verify and reverse transactions. Only verified volume feeds commissions.</p>
        </div>
        {hasPermission(user, 'transactions.create') && (
          <button type="button" className="btn btn-accent" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" /> Record transaction
          </button>
        )}
      </div>

      {hasPermission(user, 'transactions.create') && (
        <div id="create-transaction" className="mt-4" hidden={!showCreate}>
          <form onSubmit={handleCreate} className="card card-pad grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="label" htmlFor="member_code">Member code</label>
              <input className="input" type="text" id="member_code" value={createForm.member_code} onChange={(e) => setCreateForm({ ...createForm, member_code: e.target.value })} required maxLength={32} placeholder="NX-ABC123" />
              <p className="hint">Member whose account receives this volume.</p>
            </div>
            <div>
              <label className="label" htmlFor="type">Type</label>
              <select className="input" id="type" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })} required>
                <option value="sale">Sale</option>
                <option value="deposit">Deposit</option>
                <option value="other">Other</option>
              </select>
              <p className="hint">Sale, deposit or other — only eligible types feed commissions.</p>
            </div>
            <div>
              <label className="label" htmlFor="gross_amount">Gross amount (USD)</label>
              <input className="input" type="number" step="0.01" min="0.01" id="gross_amount" value={createForm.gross_amount} onChange={(e) => setCreateForm({ ...createForm, gross_amount: e.target.value })} required />
              <p className="hint">Total transaction value in USD.</p>
            </div>
            <div>
              <label className="label" htmlFor="eligible_amount">Eligible amount (defaults to gross)</label>
              <input className="input" type="number" step="0.01" min="0" id="eligible_amount" value={createForm.eligible_amount} onChange={(e) => setCreateForm({ ...createForm, eligible_amount: e.target.value })} />
              <p className="hint">Amount commissions are calculated on — leave empty to use the gross amount.</p>
            </div>
            <div>
              <label className="label" htmlFor="description">Description</label>
              <input className="input" type="text" id="description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} maxLength={255} />
              <p className="hint">Short note shown under the transaction in lists.</p>
            </div>
            <div className="sm:col-span-2 xl:col-span-5">
              <button type="submit" className="btn btn-primary">Record as pending</button>
            </div>
          </form>
        </div>
      )}

      {message && <p className="flash-err mt-4">{message}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(1).catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input className="input" type="search" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference or member" />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['pending', 'verified', 'rejected', 'refunded'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <Link to="/admin/transactions" className="btn btn-ghost" onClick={() => { setQ(''); setStatusFilter('') }}>Reset</Link>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

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
                <tr><td colSpan={8} className="text-center text-slate-400">No transactions match your filters.</td></tr>
              ) : (
                items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <span className="font-mono text-xs">{transaction.reference}</span>
                      {transaction.description && <p className="text-[11px] text-slate-400">{transaction.description}</p>}
                    </td>
                    <td>
                      <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${transaction.member_id}`}>
                        {transaction.member_name ?? '—'}
                      </Link>
                      <p className="font-mono text-[11px] text-slate-400">{transaction.member_code}</p>
                    </td>
                    <td className="text-sm capitalize">{transaction.type}</td>
                    <td className="text-right money">${Number(transaction.gross_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-right money">${Number(transaction.eligible_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className={`badge ${statusBadge(transaction.status)}`}>{transaction.status}</span></td>
                    <td className="text-sm text-slate-500">{formatDate(transaction.created_at)}</td>
                    <td className="text-right">
                      {transaction.status === 'pending' ? (
                        hasPermission(user, 'transactions.verify') && (
                          <>
                            <form onSubmit={(e) => { e.preventDefault(); verify(transaction.id, Number(transaction.eligible_amount ?? 0)) }} className="inline">
                              <button type="submit" className="btn btn-accent btn-sm">Verify</button>
                            </form>
                            <form onSubmit={(e) => { e.preventDefault(); reject(transaction.id) }} className="inline">
                              <button type="submit" className="btn btn-outline btn-sm">Reject</button>
                            </form>
                          </>
                        )
                      ) : transaction.status === 'verified' || transaction.status === 'approved' ? (
                        hasPermission(user, 'transactions.reverse') && (
                          <form onSubmit={(e) => { e.preventDefault(); reverse(transaction.id) }} className="inline">
                            <button type="submit" className="btn btn-danger btn-sm">Reverse</button>
                          </form>
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{total} total</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1).catch(() => undefined)}>Prev</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1).catch(() => undefined)}>Next</button>
        </div>
      </div>
    </>
  )
}
