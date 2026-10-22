import { useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Link } from 'react-router-dom'

export default function Network() {
  usePageTitle('Referral network')
  const [memberCode, setMemberCode] = useState('NX-EF2B3C60')
  const [depth, setDepth] = useState(2)
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')

  async function load() {
    setMessage('')
    try {
      const res = await api.get(`/admin/network?member_code=${encodeURIComponent(memberCode)}&depth=${depth}`)
      setData(res.data)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load network')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    load().catch(() => undefined)
  }

  return (
    <>
      <div>
        <h1 className="page-title">Referral network</h1>
        <p className="section-sub">Look up any member by referral code and browse their downline by depth.</p>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="member-input">Member code</label>
          <input
            className="input"
            id="member-input"
            type="text"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
            placeholder="e.g. NX-ABC123"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="depth-input">Depth (1-10)</label>
          <input
            className="input"
            id="depth-input"
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

      {!data ? (
        <div className="card card-pad mt-6 text-center text-sm text-slate-400">
          Enter a member code to explore their referral network.
          <p className="mt-2 text-xs">Tip: the demo root member code is NX-EF2B3C60 — see the members list.</p>
        </div>
      ) : (
        <>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <span className="stat-label">Root member</span>
            <span className="stat-value text-xl">{data.root?.name ?? ''}</span>
            <span className="font-mono text-xs text-slate-400">{data.root?.member_code ?? ''}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current rank</span>
            <span className="stat-value text-xl">{data.root?.current_rank?.name ?? data.root?.rank_name ?? 'Unranked'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total downline</span>
            <span className="stat-value">{(data.totalDownline ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {Object.keys(data.generationCounts ?? {}).length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(data.generationCounts ?? {}).map((entry) => (
              <div key={entry[0]} className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="stat-label">Gen {entry[0]}</p>
                <p className="mt-1 text-xl font-bold text-navy-900">{entry[1] as number}</p>
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
                {data.members?.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/admin/members/${m.id}`} className="font-semibold text-navy-900 hover:text-accent-600">{m.name ?? ''}</Link>
                      {m.id === data.root?.id && <span className="badge-accent badge ml-2">root</span>}
                    </td>
                    <td className="font-mono text-xs">{m.member_code ?? ''}</td>
                    <td className="text-sm">{m.rank_name ?? m.currentRank?.name ?? '—'}</td>
                    <td><span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{m.status ?? ''}</span></td>
                    <td className="text-sm text-slate-500">{m.registered_at ? new Date(String(m.registered_at).replace(' ', 'T')).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="text-right">
                      <Link className="btn btn-outline btn-sm" to={`/admin/members/${m.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </>
  )
}
