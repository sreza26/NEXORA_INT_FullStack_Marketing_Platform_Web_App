import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'

export default function MemberShow() {
  const { id } = useParams<{ id: string }>()
  usePageTitle('Member details')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/admin/members/${id}`).then((res) => setData(res.data)).catch(() => undefined).finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!data?.member) return <p className="text-sm text-slate-400">Member not found.</p>

  const m = data.member
  const sponsor = m.sponsor || null
  const direct = data.directReferrals || []
  const txs = data.recentTransactions || []

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
          <span className={`badge ${m.verification_status === 'verified' ? 'badge-success' : m.verification_status === 'pending' ? 'badge-warn' : m.verification_status === 'rejected' ? 'badge-danger' : 'badge-muted'}`}>{String(m.verification_status ?? '').replace(/_/g, ' ')}</span>
          {(m.roles || []).map((r: string) => <span key={r} className="badge badge-info">{r}</span>)}
          <Link to={`/admin/members/${m.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card"><span className="stat-label">Current rank</span><span className="stat-value">{m.rank_name || 'Unranked'}</span></div>
        <div className="stat-card"><span className="stat-label">Direct referrals</span><span className="stat-value">{direct.length}</span></div>
        <div className="stat-card"><span className="stat-label">Downline size</span><span className="stat-value">{data.downlineCount ?? 0}</span></div>
        <div className="stat-card"><span className="stat-label">Lifetime volume</span><span className="stat-value money">${Number(data.lifetimeVolume ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <h2 className="font-bold text-navy-900">Profile</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">Sponsor</dt><dd className="text-right font-semibold text-navy-900">{sponsor ? <><Link to={`/admin/members/${sponsor.id}`} className="hover:text-accent-600">{sponsor.name}</Link><span className="block font-mono text-[11px] text-slate-400">{sponsor.member_code}</span></> : <span className="text-slate-400">Direct / none</span>}</dd></div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">Phone</dt><dd className="text-right font-semibold text-navy-900">{m.phone || '—'}</dd></div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">Country</dt><dd className="text-right font-semibold text-navy-900">{m.profile?.country || '—'}</dd></div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">City</dt><dd className="text-right font-semibold text-navy-900">{m.profile?.city || '—'}</dd></div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">Registered</dt><dd className="text-right font-semibold text-navy-900">{m.registered_at ? new Date(String(m.registered_at).replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</dd></div>
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-2"><dt className="text-slate-500">Suspended</dt><dd className="text-right font-semibold text-navy-900">{m.suspended_at ? new Date(String(m.suspended_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd></div>
            {m.suspension_reason && <div className="flex justify-between gap-3 sm:col-span-2 border-b border-slate-50 pb-2"><dt className="text-slate-500">Suspension reason</dt><dd className="text-right font-semibold text-navy-900">{m.suspension_reason}</dd></div>}
          </dl>
          {(m.profile?.nid_document_path || m.profile?.selfie_document_path) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {m.profile?.nid_document_path && <a href={`/files/verification/${m.profile.nid_document_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">View ID document</a>}
              {m.profile?.selfie_document_path && <a href={`/files/verification/${m.profile.selfie_document_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">View selfie</a>}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Identity verification</h2>
            <form onSubmit={(e) => { e.preventDefault(); api.post(`/admin/members/${m.id}/verify`, { decision: (e.currentTarget.elements.namedItem('decision') as HTMLSelectElement)?.value, note: (e.currentTarget.elements.namedItem('note') as HTMLTextAreaElement)?.value }).then(() => window.location.reload()) }} className="mt-3 space-y-3">
              <div>
                <label className="label" htmlFor="decision">Decision</label>
                <select className="input" id="decision" name="decision" required>
                  <option value="verified">Approve (verified)</option>
                  <option value="rejected">Reject</option>
                </select>
                <p className="hint">Approving marks the member verified; rejecting records their KYC as rejected.</p>
              </div>
              <div>
                <label className="label" htmlFor="note">Note (optional)</label>
                <textarea className="input" id="note" name="note" rows={2} maxLength={1000} />
                <p className="hint">Stored with this decision in the audit log.</p>
              </div>
              <button type="submit" className="btn btn-accent w-full">Submit decision</button>
            </form>
          </div>

          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Account status</h2>
            {m.status === 'active' ? (
              <form onSubmit={(e) => { e.preventDefault(); api.post(`/admin/members/${m.id}/suspend`, { reason: (e.currentTarget.elements.namedItem('reason') as HTMLTextAreaElement)?.value }).then(() => window.location.reload()) }} className="mt-3 space-y-3">
                <div>
                  <label className="label" htmlFor="reason">Suspension reason</label>
                  <textarea className="input" id="reason" name="reason" rows={2} required maxLength={1000} />
                  <p className="hint">Suspending blocks login and commission claims immediately.</p>
                </div>
                <button type="submit" className="btn btn-danger w-full">Suspend member</button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); api.post(`/admin/members/${m.id}/activate`).then(() => window.location.reload()) }} className="mt-3">
                <button type="submit" className="btn btn-primary w-full">Reactivate member</button>
              </form>
            )}
          </div>

          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Correct sponsor</h2>
            <p className="mt-1 text-xs text-slate-400">Audited action. Use only for support corrections.</p>
            <form onSubmit={(e) => { e.preventDefault(); api.post(`/admin/members/${m.id}/sponsor`, { sponsor_code: (e.currentTarget.elements.namedItem('sponsor_code') as HTMLInputElement)?.value, reason: (e.currentTarget.elements.namedItem('sponsor_reason') as HTMLTextAreaElement)?.value }).then(() => window.location.reload()) }} className="mt-3 space-y-3">
              <div>
                <label className="label" htmlFor="sponsor_code">New sponsor code</label>
                <input className="input" id="sponsor_code" name="sponsor_code" required maxLength={32} placeholder="e.g. NX-ABC123" />
                <p className="hint">Member who will become this member's sponsor.</p>
              </div>
              <div>
                <label className="label" htmlFor="sponsor_reason">Reason</label>
                <textarea className="input" id="sponsor_reason" name="reason" rows={2} required maxLength={1000} />
                <p className="hint">Stored in the audit log with this correction.</p>
              </div>
              <button type="submit" className="btn btn-outline w-full">Change sponsor</button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-navy-900">Direct referrals ({direct.length})</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Member</th><th>Code</th><th>Rank</th><th>Joined</th></tr></thead>
              <tbody>
                {direct.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400">No direct referrals yet.</td></tr> :
                  direct.map((r: any) => (
                    <tr key={r.id}>
                      <td><Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${r.id}`}>{r.name}</Link></td>
                      <td className="font-mono text-xs">{r.member_code}</td>
                      <td className="text-sm">{r.rank_name || '—'}</td>
                      <td className="text-sm text-slate-500">{r.registered_at ? new Date(String(r.registered_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-navy-900">Recent transactions</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Reference</th><th className="text-right">Amount</th><th>Type</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {txs.length === 0 ? <tr><td colSpan={5} className="text-center text-slate-400">No transactions recorded.</td></tr> :
                  txs.map((t: any) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.reference}</td>
                      <td className="text-right money">${Number(t.gross_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="text-sm capitalize">{t.type}</td>
                      <td><span className={`badge ${t.status === 'verified' ? 'badge-success' : t.status === 'pending' ? 'badge-warn' : t.status === 'rejected' ? 'badge-danger' : t.status === 'refunded' ? 'badge-danger' : 'badge-muted'}`}>{t.status}</span></td>
                      <td className="text-sm text-slate-500">{t.created_at ? new Date(String(t.created_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
