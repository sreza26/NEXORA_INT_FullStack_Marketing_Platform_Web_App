import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function TeamShow() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  usePageTitle(data?.member?.name || 'Team Member')

  useEffect(() => {
    if (!id) return
    api.get(`/member/team/${id}`).then((res) => setData(res.data)).catch(() => setData(null))
  }, [id])

  if (!data?.member) return <p className="text-sm text-slate-400">Loading…</p>
  const member = data.member

  return (
    <>
      <Link to="/member/team" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to team
      </Link>

      <div className="mt-4 card card-pad">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-lg font-black text-accent-400">
            {String(member.name).slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-navy-900">{member.name}</h1>
              <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{member.status}</span>
              {member.currentRank ? <span className="badge badge-info">{member.currentRank.name}</span> : null}
            </div>
            <p className="text-sm text-slate-500">{member.email} &middot; <span className="font-mono">{member.member_code}</span></p>
          </div>
          <div className="text-right text-sm">
            <p className="stat-label">Depth in your network</p>
            <p className="text-lg font-bold text-navy-900">{data.depth ? 'Gen ' + data.depth : '—'}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div>
            <dt className="stat-label">Sponsor</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">{member.sponsor?.name || 'Direct member'}</dd>
          </div>
          <div>
            <dt className="stat-label">Registered</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">{member.registered_at ? new Date(String(member.registered_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd>
          </div>
          <div>
            <dt className="stat-label">Verification</dt>
            <dd className="mt-1 text-sm font-semibold capitalize">{String(member.verification_status || '').replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Direct referrals of {String(member.name).split(' ')[0]}</h2>
          <span className="badge badge-muted">{(data.directReferrals || []).length} shown</span>
        </div>
        <div className="table-wrap">
          <Table
            head={['Member', 'Member code', 'Rank', 'Joined']}
            rows={(data.directReferrals || []).length === 0
              ? [['No direct referrals yet.', '', '', '']]
              : (data.directReferrals || []).map((ref: any) => [
                  <span key={`name-${ref.id}`} className="font-semibold text-navy-900">{ref.name}</span>,
                  <span key={`code-${ref.id}`} className="font-mono text-xs">{ref.member_code}</span>,
                  ref.currentRank?.name || '—',
                  ref.registered_at ? new Date(String(ref.registered_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                ])
            }
          />
        </div>
      </div>
    </>
  )
}
