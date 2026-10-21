import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Commissions() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get('/member/commissions').then((res) => setData(res.data)).catch(() => setData(null))
  }, [])

  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Commission earned" value={money(data.total)} />
        <Stat label="Entries" value={data.items.length} />
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Commission history</h3>
            <p style={{ color: 'var(--text-muted)' }}>Every payout generated from your downline</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Source', 'Generation', 'Rate', 'Amount', 'Status', 'Date']}
            rows={data.items.map((c: any) => [
              c.source_name ?? '—',
              c.generation,
              `${(c.rate * 100).toFixed(0)}%`,
              money(c.amount),
              c.status,
              new Date(c.created_at).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
