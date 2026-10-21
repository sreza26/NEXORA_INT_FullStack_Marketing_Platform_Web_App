import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Table } from '../../components/Shell'

export default function Rewards() {
  const [data, setData] = useState<any>(null)
  const [rank, setRank] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/member/rewards'), api.get('/member/rank')])
      .then(([r, k]) => {
        setData(r.data)
        setRank(k.data)
      })
      .catch(() => setData(null))
  }, [])

  async function claim(rewardId: number) {
    setError('')
    try {
      await api.post('/member/rewards/claim', { reward_id: rewardId })
      const res = await api.get('/member/rewards')
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to claim this reward')
    }
  }

  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <header className="card-header">
          <div>
            <h3>Your rank</h3>
            <p style={{ color: 'var(--text-muted)' }}>Rank is recalculated from your network activity</p>
          </div>
        </header>
        <div className="card-body">
          <p style={{ fontSize: '1.6rem', fontWeight: 700 }}>{rank?.rank?.name ?? 'Unranked'}</p>
          <p style={{ color: 'var(--text-muted)' }}>
            Monthly salary: {money(rank?.rank?.salary ?? 0)} · Achievements: {rank?.achievements?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <header className="card-header">
          <div>
            <h3>Reward catalogue</h3>
            <p style={{ color: 'var(--text-muted)' }}>Claim with your wallet balance</p>
          </div>
        </header>
        <div className="card-body">
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <div className="grid grid-3">
            {data.rewards.map((reward: any) => (
              <article key={reward.id} className="card">
                <div className="card-body">
                  <h4>{reward.title}</h4>
                  <p style={{ color: 'var(--text-muted)' }}>{reward.description}</p>
                  <p style={{ fontWeight: 700 }}>{money(reward.cost)}</p>
                  <button className="btn btn-primary" onClick={() => claim(reward.id)}>Claim</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Your claims</h3>
            <p style={{ color: 'var(--text-muted)' }}>Reward requests and their status</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Reward', 'Cost', 'Status', 'Claimed']}
            rows={data.claims.map((c: any) => [
              c.title,
              money(c.cost),
              c.status,
              new Date(c.claimed_at.replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
