import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

interface Member {
  id: number
  name: string
  email: string
  member_code: string
  status: string
  registered_at: string
  currentRank?: { name: string }
}

export default function Team() {
  usePageTitle('My Team')
  const [searchParams, setSearchParams] = useSearchParams()
  const generation = searchParams.get('generation') || ''
  const q = searchParams.get('q') || ''
  const [members, setMembers] = useState<Member[]>([])
  const [generationCounts, setGenerationCounts] = useState<Record<number, number>>({})
  const [search, setSearch] = useState(q)

  useEffect(() => {
    const params = new URLSearchParams()
    if (generation) params.set('generation', generation)
    if (q) params.set('q', q)
    api.get(`/member/team${params.toString() ? '?' + params.toString() : ''}`).then((res) => {
      setMembers(res.data.members || [])
      setGenerationCounts(res.data.generationCounts || {})
    }).catch(() => undefined)
  }, [generation, q])

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) params.set('q', search)
    else params.delete('q')
    setSearchParams(params)
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">My team</h1>
          <p className="section-sub">Search your downline and filter by generation.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/member/team" className={`filter-chip ${!generation ? 'filter-chip-active' : ''}`}>All</Link>
        {[1, 2, 3, 4, 5, 6].map((g) => {
          if ((generationCounts[g] ?? 0) > 0 || g <= 3) {
            return <Link key={g} to={`/member/team?generation=${g}`} className={`filter-chip ${generation === String(g) ? 'filter-chip-active' : ''}`}>Gen {g} <span className="text-slate-400">({generationCounts[g] ?? 0})</span></Link>
          }
          return null
        })}
      </div>

      <form onSubmit={onSearch} className="mt-4 flex max-w-md gap-2">
        {generation ? <input type="hidden" name="generation" value={generation} /> : null}
        <input
          className="input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or member code"
        />
        <button type="submit" className="btn btn-outline">Search</button>
      </form>
      <p className="hint">Leave empty to show everyone. The generation chips above control how many levels are listed.</p>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <Table
            head={['Member', 'Member code', 'Rank', 'Joined', 'Status', '']}
            rows={members.length === 0 ? [
              ['No members match your filters yet.', '', '', '', '', '']
            ] : members.map((member) => [
              <div key={member.id} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-accent-400">
                  {String(member.name).slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="font-semibold text-navy-900">{member.name}</p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
              </div>,
              <span key={`code-${member.id}`} className="font-mono text-xs">{member.member_code}</span>,
              member.currentRank?.name || '—',
              member.registered_at ? new Date(String(member.registered_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              <span key={`status-${member.id}`} className={`badge ${member.status === 'active' ? 'badge-success' : member.status === 'suspended' ? 'badge-danger' : 'badge-muted'}`}>{member.status}</span>,
              <Link key={`view-${member.id}`} to={`/member/team/${member.id}`} className="text-xs font-semibold text-accent-600 hover:underline">View</Link>,
            ])}
          />
        </div>
      </div>
    </>
  )
}
