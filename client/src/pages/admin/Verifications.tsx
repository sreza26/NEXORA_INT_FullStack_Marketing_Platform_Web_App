import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ScanFace, User } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface VerificationRow {
  id: number
  name: string
  email: string
  member_code: string
  phone: string | null
  updated_at: string
  full_name: string | null
  nid_number: string | null
  country: string | null
  city: string | null
  nid_document_path: string | null
  selfie_document_path: string | null
}

export default function Verifications() {
  usePageTitle('Verification Queue')
  const [items, setItems] = useState<VerificationRow[]>([])
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function load() {
    try {
      const res = await api.get('/admin/verifications')
      setItems(res.data?.items ?? [])
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load verifications')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  function decide(id: number, decision: 'verified' | 'rejected') {
    setMessage('')
    api
      .post(`/admin/members/${id}/verify`, { decision, note: notes[id] ?? null })
      .then(() => {
        setMessage('Identity verification updated.')
        load()
      })
      .catch((err: any) => setMessage(err.response?.data?.message ?? 'Action failed'))
  }

  return (
    <>
      <div>
        <h1 className="page-title">Identity verification queue</h1>
        <p className="section-sub">Members awaiting KYC review. Documents are served through an authorized download route.</p>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {items.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400 lg:col-span-2">
            No pending identity verifications. The queue is clear.
          </div>
        ) : (
          items.map((member) => (
            <div key={member.id} className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-navy-900">{member.full_name ?? member.name}</h2>
                  <p className="font-mono text-xs text-slate-400">
                    {member.member_code} · {member.email}
                  </p>
                </div>
                <span className="badge badge-warn">pending</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="stat-label">NID / Passport</dt>
                  <dd className="font-mono font-semibold text-navy-900">{member.nid_number ?? '—'}</dd>
                </div>
                <div>
                  <dt className="stat-label">Country</dt>
                  <dd className="font-semibold text-navy-900">{member.country ?? '—'}</dd>
                </div>
                <div>
                  <dt className="stat-label">Submitted</dt>
                  <dd className="font-semibold text-navy-900">
                    {member.updated_at ? new Date(member.updated_at.replace(' ', 'T')).toLocaleString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="stat-label">Phone</dt>
                  <dd className="font-semibold text-navy-900">{member.phone ?? '—'}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {member.nid_document_path && (
                  <a className="btn btn-outline btn-sm" href={`/files/verification/${member.nid_document_path}`} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> ID document
                  </a>
                )}
                {member.selfie_document_path && (
                  <a className="btn btn-outline btn-sm" href={`/files/verification/${member.selfie_document_path}`} target="_blank" rel="noreferrer">
                    <ScanFace className="h-4 w-4" /> Selfie
                  </a>
                )}
                <Link className="btn btn-ghost btn-sm" to={`/admin/members/${member.id}`}>
                  <User className="h-4 w-4" /> Full profile
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                <div className="min-w-40 flex-1">
                  <label className="label" htmlFor={`note-${member.id}`}>Approval note (optional)</label>
                  <input
                    className="input"
                    id={`note-${member.id}`}
                    maxLength={1000}
                    value={notes[member.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [member.id]: e.target.value })}
                  />
                </div>
                <button className="btn btn-accent btn-sm" onClick={() => decide(member.id, 'verified')}>Approve</button>
                <p className="hint w-full">Optional note stored with the approval in the audit log.</p>
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1">
                  <label className="label" htmlFor={`reject-note-${member.id}`}>Rejection reason</label>
                  <input
                    className="input"
                    id={`reject-note-${member.id}`}
                    maxLength={1000}
                    value={notes[member.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [member.id]: e.target.value })}
                  />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => decide(member.id, 'rejected')}>Reject</button>
                <p className="hint w-full">Reason is stored in the audit log and shown to the member.</p>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}