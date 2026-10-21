import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Wallet() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get('/member/ledger').then((res) => setData(res.data)).catch(() => setData(null))
  }, [])

  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Available balance" value={money(data.balance)} />
        <Stat label="Ledger entries" value={data.items.length} />
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Wallet ledger</h3>
            <p style={{ color: 'var(--text-muted)' }}>Append-only record of every movement</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Type', 'Direction', 'Amount', 'Balance after', 'Status', 'Date']}
            rows={data.items.map((e: any) => [
              e.type,
              e.direction,
              money(e.amount),
              money(e.balance_after),
              e.status,
              new Date(e.created_at.replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
