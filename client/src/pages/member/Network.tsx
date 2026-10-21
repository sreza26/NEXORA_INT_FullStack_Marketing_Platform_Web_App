import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Network() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get('/member/network').then((res) => setData(res.data)).catch(() => setData(null))
  }, [])

  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Total network" value={data.total} />
        <Stat label="Team volume" value={money(data.volume)} />
        <Stat label="Generations" value={data.levels.length} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <header className="card-header">
          <div>
            <h3>Your referral link</h3>
            <p style={{ color: 'var(--text-muted)' }}>Share this link to grow your network</p>
          </div>
        </header>
        <div className="card-body">
          <input className="input" readOnly value={data.referral_link} onFocus={(e) => e.target.select()} />
        </div>
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Downline by generation</h3>
            <p style={{ color: 'var(--text-muted)' }}>How your network is distributed</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Generation', 'Members']}
            rows={data.levels.map((l: any) => [`Level ${l.level}`, l.count])}
          />
        </div>
      </div>
    </>
  )
}
