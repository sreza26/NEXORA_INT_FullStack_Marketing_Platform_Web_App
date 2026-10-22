import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function Members() {
  usePageTitle('Members')
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [message, setMessage] = useState('')

  async function load(q = search, status = statusFilter, verification = verificationFilter) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (verification) params.set('verification', verification)
    try {
      const res = await api.get(`/admin/members?${params.toString()}`)
      setItems(res.data?.items ?? [])
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Load failed')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="section-sub">Search and manage all registered members.</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="member-search">Search</label>
          <input
            className="input"
            id="member-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or member code"
          />
        </div>
        <div>
          <label className="label" htmlFor="status-filter">Status</label>
          <select className="input" id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="verification-filter">Verification</label>
          <select className="input" id="verification-filter" value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
            <option value="">All</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <a href="/admin/members" className="btn btn-ghost">Reset</a>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Rows with this status only.</p>
        <p className="hint w-full">Members at this KYC verification state only.</p>
      </form>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <Table
            head={['Member', 'Code', 'Rank', 'Status', 'Verification', 'Joined', 'Actions']}
            rows={items.map((m: any) => [
              <span key={m.id}>
                <Link to={`/admin/members/${m.id}`} className="font-semibold text-navy-900 hover:text-accent-600">{m.name}</Link>
                <p className="text-xs text-slate-400">{m.email}</p>
              </span>,
              <span key={`c-${m.id}`} className="font-mono text-xs">{m.member_code ?? ''}</span>,
              <span key={`r-${m.id}`} className="text-sm">{m.current_rank?.name ?? m.rank_name ?? '—'}</span>,
              <span key={`s-${m.id}`} className={`badge ${m.status === 'active' ? 'badge-success' : (m.status === 'suspended' ? 'badge-danger' : 'badge-muted')}`}>{m.status ?? ''}</span>,
              <span key={`v-${m.id}`} className={`badge ${m.verification_status === 'verified' ? 'badge-success' : m.verification_status === 'pending' ? 'badge-warn' : m.verification_status === 'rejected' ? 'badge-danger' : 'badge-muted'}`}>{m.verification_status ?? '—'}</span>,
              <span key={`j-${m.id}`} className="text-sm text-slate-500">{m.registered_at ? new Date(String(m.registered_at).replace(' ', 'T')).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>,
              <div key={`a-${m.id}`} className="flex justify-end gap-2">
                <Link to={`/admin/members/${m.id}`} className="btn btn-outline btn-sm">View</Link>
                <Link to={`/admin/members/${m.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
              </div>,
            ])}
          />
        </div>
        {items.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">No members match your filters.</p>
        )}
      </div>
    </>
  )
}
