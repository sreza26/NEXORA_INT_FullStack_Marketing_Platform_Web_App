import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, Pencil, ScanFace, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { usePageTitle } from '../../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../../lib/auth'

interface Member {
  id: number
  name: string
  email: string
  member_code: string
  phone: string | null
  status: string
  verification_status: string
  suspension_reason: string | null
  suspended_at: string | null
  registered_at: string | null
  rank_name: string | null
  roles: string[]
  sponsor: { id: number; name: string; member_code: string } | null
  profile: {
    country?: string | null
    city?: string | null
    nid_document_path?: string | null
    selfie_document_path?: string | null
  } | null
}

interface DirectReferral {
  id: number
  name: string
  member_code: string
  rank_name: string | null
  registered_at: string | null
}

interface Transaction {
  id: number
  reference: string
  gross_amount: number
  type: string
  status: string
  created_at: string | null
}

interface MemberDetail {
  member: Member
  directReferrals: DirectReferral[]
  downlineCount: number
  lifetimeVolume: number
  recentTransactions: Transaction[]
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value.replace(' ', 'T')).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function verificationBadge(status: string): string {
  if (status === 'verified') return 'badge-success'
  if (status === 'pending') return 'badge-warn'
  if (status === 'rejected') return 'badge-danger'
  return 'badge-muted'
}

function transactionBadge(status: string): string {
  if (status === 'verified') return 'badge-success'
  if (status === 'pending') return 'badge-warn'
  if (status === 'rejected' || status === 'refunded') return 'badge-danger'
  return 'badge-muted'
}

export default function MemberShow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [decision, setDecision] = useState('verified')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [sponsorCode, setSponsorCode] = useState('')
  const [sponsorReason, setSponsorReason] = useState('')
  usePageTitle(data?.member.name ?? 'Member')

  async function load() {
    if (!id) return
    const res = await api.get(`/admin/members/${id}`)
    setData(res.data as MemberDetail)
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!data?.member) return <p className="text-sm text-slate-400">Member not found.</p>

  const m = data.member
  const direct = data.directReferrals ?? []
  const txs = data.recentTransactions ?? []

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/admin/members/${m.id}/verify`, { decision, note })
    await load()
    setNote('')
  }

  async function submitSuspend(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/admin/members/${m.id}/suspend`, { reason })
    await load()
    setReason('')
  }

  async function activate() {
    await api.post(`/admin/members/${m.id}/activate`)
    await load()
  }

  async function submitSponsor(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/admin/members/${m.id}/sponsor`, { sponsor_code: sponsorCode, reason: sponsorReason })
    await load()
    setSponsorCode('')
    setSponsorReason('')
  }

  async function remove() {
    const ok = window.confirm(
      `Delete ${m.name} (${m.member_code})?\n\nThis permanently removes the account AND all associated data: profile, referrals, transactions, commissions, salary payouts, wallet ledger entries and reward claims. This cannot be undone.`,
    )
    if (!ok) return
    await api.delete(`/admin/members/${m.id}`)
    navigate('/admin/members')
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/members" className="text-sm text-accent-600 hover:underline">← Back to members</Link>
          <h1 className="page-title mt-1">{m.name}</h1>
          <p className="section-sub font-mono">{m.member_code} · {m.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{m.status}</span>
          <span className={`badge ${verificationBadge(m.verification_status)}`}>
            {String(m.verification_status).replace('_', ' ')}
          </span>
          {m.roles.map((role) => (
            <span key={role} className="badge badge-info">{role}</span>
          ))}
          {hasPermission(user, 'members.manage') && (
            <Link to={`/admin/members/${m.id}/edit`} className="btn btn-outline btn-sm">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          )}
          {hasPermission(user, 'members.manage') && (
            <button type="button" className="btn btn-sm border-rose-300 bg-white text-rose-600 hover:bg-rose-50" onClick={() => remove().catch(() => undefined)}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Current rank</span>
          <span className="stat-value">{m.rank_name ?? 'Unranked'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Direct referrals</span>
          <span className="stat-value">{direct.length.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Downline size</span>
          <span className="stat-value">{Number(data.downlineCount).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime volume</span>
          <span className="stat-value money">${Number(data.lifetimeVolume).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <h2 className="font-bold text-navy-900">Profile</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">Sponsor</dt>
              <dd className="text-right font-semibold text-navy-900">
                {m.sponsor ? (
                  <>
                    <Link className="hover:text-accent-600" to={`/admin/members/${m.sponsor.id}`}>{m.sponsor.name}</Link>
                    <span className="block font-mono text-[11px] text-slate-400">{m.sponsor.member_code}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Direct / none</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-right font-semibold text-navy-900">{m.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">Country</dt>
              <dd className="text-right font-semibold text-navy-900">{m.profile?.country ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">City</dt>
              <dd className="text-right font-semibold text-navy-900">{m.profile?.city ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">Registered</dt>
              <dd className="text-right font-semibold text-navy-900">{formatDateTime(m.registered_at)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
              <dt className="text-slate-500">Suspended</dt>
              <dd className="text-right font-semibold text-navy-900">{m.suspended_at ? formatDate(m.suspended_at) : '—'}</dd>
            </div>
            {m.suspension_reason && (
              <div className="flex justify-between gap-3 sm:col-span-2">
                <dt className="text-slate-500">Suspension reason</dt>
                <dd className="text-right font-semibold text-navy-900">{m.suspension_reason}</dd>
              </div>
            )}
          </dl>

          {m.profile?.nid_document_path && (
            <div className="mt-4 flex flex-wrap gap-3">
              <a className="btn btn-outline btn-sm" href={`/files/verification/${m.profile.nid_document_path}`} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" /> View ID document
              </a>
              <a className="btn btn-outline btn-sm" href={`/files/verification/${m.profile.selfie_document_path}`} target="_blank" rel="noreferrer">
                <ScanFace className="h-4 w-4" /> View selfie
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {hasPermission(user, 'members.verify_identity') && (
            <div className="card card-pad">
              <h2 className="font-bold text-navy-900">Identity verification</h2>
              <form onSubmit={(e) => submitVerify(e).catch(() => undefined)} className="mt-3 space-y-3">
                <div>
                  <label className="label" htmlFor="decision">Decision</label>
                  <select className="input" id="decision" value={decision} onChange={(e) => setDecision(e.target.value)} required>
                    <option value="verified">Approve (verified)</option>
                    <option value="rejected">Reject</option>
                  </select>
                  <p className="hint">Approving marks the member verified; rejecting records their KYC as rejected.</p>
                </div>
                <div>
                  <label className="label" htmlFor="note">Note (optional)</label>
                  <textarea className="input" id="note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                  <p className="hint">Stored with this decision in the audit log.</p>
                </div>
                <button type="submit" className="btn btn-accent w-full">Submit decision</button>
              </form>
            </div>
          )}

          {hasPermission(user, 'members.suspend') && (
            <div className="card card-pad">
              <h2 className="font-bold text-navy-900">Account status</h2>
              {m.status === 'active' ? (
                <form onSubmit={(e) => submitSuspend(e).catch(() => undefined)} className="mt-3 space-y-3">
                  <div>
                    <label className="label" htmlFor="reason">Suspension reason</label>
                    <textarea className="input" id="reason" rows={2} required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                    <p className="hint">Suspending blocks login and commission claims immediately.</p>
                  </div>
                  <button type="submit" className="btn btn-danger w-full">Suspend member</button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); activate().catch(() => undefined) }} className="mt-3">
                  <button type="submit" className="btn btn-primary w-full">Reactivate member</button>
                </form>
              )}
            </div>
          )}

          {hasPermission(user, 'members.change_sponsor') && (
            <div className="card card-pad">
              <h2 className="font-bold text-navy-900">Correct sponsor</h2>
              <p className="mt-1 text-xs text-slate-400">Audited action. Use only for support corrections.</p>
              <form onSubmit={(e) => submitSponsor(e).catch(() => undefined)} className="mt-3 space-y-3">
                <div>
                  <label className="label" htmlFor="sponsor_code">New sponsor code</label>
                  <input className="input" id="sponsor_code" required maxLength={32} placeholder="e.g. NX-ABC123" value={sponsorCode} onChange={(e) => setSponsorCode(e.target.value)} />
                  <p className="hint">Member who will become this member's sponsor.</p>
                </div>
                <div>
                  <label className="label" htmlFor="sponsor_reason">Reason</label>
                  <textarea className="input" id="sponsor_reason" rows={2} required maxLength={1000} value={sponsorReason} onChange={(e) => setSponsorReason(e.target.value)} />
                  <p className="hint">Stored in the audit log with this correction.</p>
                </div>
                <button type="submit" className="btn btn-outline w-full">Change sponsor</button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Direct referrals ({direct.length})</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Code</th>
                  <th>Rank</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {direct.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400">No direct referrals yet.</td>
                  </tr>
                ) : (
                  direct.map((referral) => (
                    <tr key={referral.id}>
                      <td>
                        <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${referral.id}`}>
                          {referral.name}
                        </Link>
                      </td>
                      <td className="font-mono text-xs">{referral.member_code}</td>
                      <td className="text-sm">{referral.rank_name ?? '—'}</td>
                      <td className="text-sm text-slate-500">{formatDate(referral.registered_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">Recent transactions</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400">No transactions recorded.</td>
                  </tr>
                ) : (
                  txs.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-mono text-xs">{transaction.reference}</td>
                      <td className="text-right money">
                        ${Number(transaction.gross_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-sm capitalize">{transaction.type}</td>
                      <td>
                        <span className={`badge ${transactionBadge(transaction.status)}`}>{transaction.status}</span>
                      </td>
                      <td className="text-sm text-slate-500">{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
