import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import { usePageTitle } from '../../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../../lib/auth'

interface MemberRow {
  id: number
  name: string
  email: string
  member_code: string
  status: string
  verification_status: string
  rank_name: string | null
  registered_at: string | null
}

interface MembersResponse {
  items: MemberRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
  statuses: string[]
  verifications: string[]
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
  if (status === 'active') return 'badge-success'
  if (status === 'suspended') return 'badge-danger'
  return 'badge-muted'
}

function verificationBadge(status: string): string {
  if (status === 'verified') return 'badge-success'
  if (status === 'pending') return 'badge-warn'
  if (status === 'rejected') return 'badge-danger'
  return 'badge-muted'
}

export default function MembersIndex() {
  usePageTitle('Members')
  const { user } = useAuth()
  const [items, setItems] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [statuses, setStatuses] = useState<string[]>([])
  const [verifications, setVerifications] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function load(pageNumber = 1) {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (statusFilter) params.set('status', statusFilter)
    if (verificationFilter) params.set('verification', verificationFilter)
    params.set('page', String(pageNumber))
    const res = await api.get(`/admin/members?${params.toString()}`)
    const data = res.data as MembersResponse
    setItems(data.items ?? [])
    setTotal(data.total ?? 0)
    setPage(data.page ?? 1)
    setTotalPages(data.totalPages ?? 1)
    setStatuses(data.statuses ?? [])
    setVerifications(data.verifications ?? [])
  }

  useEffect(() => {
    load(1).catch(() => undefined)
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="section-sub">Search and manage all registered members.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(1).catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input
            className="input"
            id="q"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or member code"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="verification">Verification</label>
          <select className="input" id="verification" value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
            <option value="">All</option>
            {verifications.map((verification) => (
              <option key={verification} value={verification}>{verification}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <Link to="/admin/members" className="btn btn-ghost" onClick={() => {
          setSearch('')
          setStatusFilter('')
          setVerificationFilter('')
        }}>Reset</Link>
        <p className="hint w-full">Leave empty to show all rows.</p>
        <p className="hint w-full">Rows with this status only.</p>
        <p className="hint w-full">Members at this KYC verification state only.</p>
      </form>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Code</th>
                <th>Rank</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400">No members match your filters.</td>
                </tr>
              ) : (
                items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${member.id}`}>
                        {member.name}
                      </Link>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </td>
                    <td className="font-mono text-xs">{member.member_code}</td>
                    <td className="text-sm">{member.rank_name ?? '—'}</td>
                    <td>
                      <span className={`badge ${statusBadge(member.status)}`}>{member.status}</span>
                    </td>
                    <td>
                      <span className={`badge ${verificationBadge(member.verification_status)}`}>{member.verification_status}</span>
                    </td>
                    <td className="text-sm text-slate-500">{formatDate(member.registered_at)}</td>
                    <td className="text-right">
                      <Link className="btn btn-outline btn-sm" to={`/admin/members/${member.id}`}>View</Link>
                      {hasPermission(user, 'members.manage') && (
                        <Link className="btn btn-ghost btn-sm" to={`/admin/members/${member.id}/edit`}>Edit</Link>
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
