import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface NetworkMember {
  id: number
  name: string
  member_code: string
  status: string
  registered_at: string | null
  rank_name: string | null
}

interface NetworkResult {
  root: NetworkMember
  generationCounts: Record<string, number>
  totalDownline: number
  members: NetworkMember[]
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Network() {
  usePageTitle('Network Explorer')
  const [memberCode, setMemberCode] = useState('')
  const [depth, setDepth] = useState(2)
  const [data, setData] = useState<NetworkResult | null>(null)

  async function load() {
    try {
      const res = await api.get(
        `/admin/network?member_code=${encodeURIComponent(memberCode)}&depth=${depth}`,
      )
      setData(res.data as NetworkResult)
    } catch {
      setData(null)
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Referral network</h1>
        <p className="section-sub">Look up any member by referral code and browse their downline by depth.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load().catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="member">Member code</label>
          <input
            className="input"
            id="member"
            type="text"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
            placeholder="e.g. NX-ABC123"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="depth">Depth (1-10)</label>
          <input
            className="input"
            id="depth"
            type="number"
            min={1}
            max={10}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Load network</button>
        <p className="hint w-full">The member whose downline will be shown.</p>
        <p className="hint w-full">How many generations down to display, from 1 to 10.</p>
      </form>

      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Root member</span>
              <span className="stat-value text-xl">{data.root.name}</span>
              <span className="font-mono text-xs text-slate-400">{data.root.member_code}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Current rank</span>
              <span className="stat-value text-xl">{data.root.rank_name ?? 'Unranked'}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total downline</span>
              <span className="stat-value">{Number(data.totalDownline).toLocaleString()}</span>
            </div>
          </div>

          {Object.keys(data.generationCounts ?? {}).length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(data.generationCounts).map(([generation, count]) => (
                <div key={generation} className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="stat-label">Gen {generation}</p>
                  <p className="mt-1 text-xl font-bold text-navy-900">{count}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Code</th>
                    <th>Rank</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-400">No members found at this depth.</td>
                    </tr>
                  ) : (
                    data.members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${member.id}`}>
                            {member.name}
                          </Link>
                          {member.id === data.root.id && <span className="badge badge-accent ml-2">root</span>}
                        </td>
                        <td className="font-mono text-xs">{member.member_code}</td>
                        <td className="text-sm">{member.rank_name ?? '—'}</td>
                        <td>
                          <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="text-sm text-slate-500">{formatDate(member.registered_at)}</td>
                        <td className="text-right">
                          <Link className="btn btn-outline btn-sm" to={`/admin/members/${member.id}`}>View</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card card-pad mt-6 text-center text-sm text-slate-400">
          Enter a member code to explore their referral network.
          <p className="mt-2 text-xs">
            Tip: the demo root member code is <span className="font-mono font-semibold text-navy-900">root</span>'s code — see the members list.
          </p>
        </div>
      )}
    </>
  )
}
