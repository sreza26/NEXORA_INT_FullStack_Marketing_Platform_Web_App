import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../lib/auth'

interface RewardClaim {
  id: number
  member_id: number
  member_name: string | null
  reward_name: string | null
  status: string
  note: string | null
  claimed_at: string | null
  created_at: string | null
}

interface ClaimsResponse {
  items: RewardClaim[]
  total: number
  statuses: string[]
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: string): string {
  if (status === 'pending') return 'badge-warn'
  if (status === 'approved') return 'badge-success'
  if (status === 'rejected') return 'badge-danger'
  return 'badge-muted'
}

export default function RewardClaims() {
  usePageTitle('Reward Claims')
  const { user } = useAuth()
  const [items, setItems] = useState<RewardClaim[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [approveNotes, setApproveNotes] = useState<Record<number, string>>({})
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({})

  async function load() {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    const res = await api.get(`/admin/reward-claims?${params.toString()}`)
    const data = res.data as ClaimsResponse
    setItems(data.items ?? [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [statusFilter])

  async function resolve(id: number, action: 'approve' | 'reject', note: string) {
    await api.post(`/admin/reward-claims/${id}/${action}`, { action, note })
    await load()
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Reward claims</h1>
          <p className="section-sub">Review member reward claims. Approval marks the claim fulfilled; rejection requires a note.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load().catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['pending', 'approved', 'rejected'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <Link to="/admin/reward-claims" className="btn btn-ghost" onClick={() => setStatusFilter('')}>Reset</Link>
        <p className="hint w-full">Rows with this status only.</p>
      </form>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400">No reward claims match your filter.</div>
        ) : (
          items.map((claim) => (
            <div key={claim.id} className="card card-pad flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="font-bold text-navy-900 hover:text-accent-600" to={`/admin/members/${claim.member_id}`}>
                    {claim.member_name ?? '—'}
                  </Link>
                  <span className={`badge ${statusBadge(claim.status)}`}>{claim.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Reward: <span className="font-semibold text-navy-900">{claim.reward_name ?? '—'}</span>
                </p>
                {claim.note && (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">{claim.note}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Submitted {formatDate(claim.claimed_at ?? claim.created_at)}</p>
              </div>

              {claim.status === 'pending' ? (
                hasPermission(user, 'rewards.claims.review') && (
                  <div className="flex flex-wrap gap-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        resolve(claim.id, 'approve', approveNotes[claim.id] ?? '').catch(() => undefined)
                      }}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div>
                        <label className="label" htmlFor={`note-approve-${claim.id}`}>Note (optional)</label>
                        <input
                          className="input"
                          type="text"
                          id={`note-approve-${claim.id}`}
                          maxLength={1000}
                          value={approveNotes[claim.id] ?? ''}
                          onChange={(e) => setApproveNotes({ ...approveNotes, [claim.id]: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn btn-accent btn-sm">Approve</button>
                      <p className="hint w-full">Optional note stored with the approval in the audit log.</p>
                    </form>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        resolve(claim.id, 'reject', rejectNotes[claim.id] ?? '').catch(() => undefined)
                      }}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div>
                        <label className="label" htmlFor={`note-reject-${claim.id}`}>Rejection reason</label>
                        <input
                          className="input"
                          type="text"
                          id={`note-reject-${claim.id}`}
                          maxLength={1000}
                          required
                          value={rejectNotes[claim.id] ?? ''}
                          onChange={(e) => setRejectNotes({ ...rejectNotes, [claim.id]: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn btn-danger btn-sm">Reject</button>
                      <p className="hint w-full">Reason is stored in the audit log and shown to the member.</p>
                    </form>
                  </div>
                )
              ) : (
                <span className="text-xs text-slate-400">Reviewed</span>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}
