import { useEffect, useState } from 'react'
import { api, money } from '../lib/api'
import { Table } from '../components/Shell'

export function MarketingPlan() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    api.get('/public/config').then((res) => setConfig(res.data)).catch(() => setConfig(null))
  }, [])

  if (!config) return <div className="container" style={{ padding: '3rem' }}>Loading…</div>

  const rates = config.commission.rates ?? []
  const generations = rates.map((rate: number, index: number) => ({
    generation: index + 1,
    rate: rate * 100,
    example: 100 * rate,
  }))

  return (
    <div className="container" style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: '760px' }}>
        <span className="badge">Marketing plan</span>
        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1 }}>Earn on every level you build.</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          NEXORA pays commission up to {config.commission.generation} generations deep. A purchase by a member in your
          downline automatically credits your wallet, your sponsor and the chain above.
        </p>
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Commission table</h3>
            <p style={{ color: 'var(--text-muted)' }}>Example based on a {money(100)} qualifying purchase</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Generation', 'Rate', 'Example payout']}
            rows={generations.map((g: any) => [`Level ${g.generation}`, `${g.rate.toFixed(0)}%`, money(g.example)])}
          />
        </div>
      </div>
    </div>
  )
}

export function RankPlan() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    api.get('/public/config').then((res) => setConfig(res.data)).catch(() => setConfig(null))
  }, [])

  if (!config) return <div className="container" style={{ padding: '3rem' }}>Loading…</div>

  return (
    <div className="container" style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: '760px' }}>
        <span className="badge">Rank plan</span>
        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1 }}>Milestones that unlock real income.</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Rank is recalculated automatically from your direct referrals and downline volume. Every rank carries a monthly
          salary paid straight into your wallet.
        </p>
      </div>

      <div className="grid grid-3">
        {config.ranks.map((rank: any) => (
          <article key={rank.id} className="card">
            <header className="card-header">
              <div>
                <h3>{rank.name}</h3>
                <p style={{ color: 'var(--text-muted)' }}>Level {rank.level}</p>
              </div>
            </header>
            <div className="card-body">
              <p style={{ fontSize: '1.6rem', fontWeight: 700 }}>{money(rank.salary)}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/month</span></p>
              <p style={{ color: 'var(--text-muted)' }}>Direct links: {rank.min_direct_links}</p>
              <p style={{ color: 'var(--text-muted)' }}>Downline volume: {money(rank.downline_volume)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function PublicRewards() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    api.get('/public/config').then((res) => setConfig(res.data)).catch(() => setConfig(null))
  }, [])

  if (!config) return <div className="container" style={{ padding: '3rem' }}>Loading…</div>

  return (
    <div className="container" style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: '760px' }}>
        <span className="badge">Rewards</span>
        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1 }}>Turn your network into perks.</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Claim catalogue rewards with your wallet balance. Approved claims are fulfilled by the finance team.
        </p>
      </div>

      <div className="grid grid-3">
        {config.rewards.map((reward: any) => (
          <article key={reward.id} className="card">
            <div className="card-body">
              <h3>{reward.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{reward.description}</p>
              <p style={{ fontWeight: 700 }}>{money(reward.cost)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
