import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Overview() {
  const [stats, setStats] = useState<any>(null)
  const [pending, setPending] = useState<any[]>([])

  useEffect(() => {
    Promise.all([api.get('/admin/summary'), api.get('/admin/withdrawals?status=pending')])
      .then(([s, p]) => {
        setStats(s.data)
        setPending(p.data)
      })
      .catch(() => setStats(null))
  }, [])

  if (!stats) return <p>Loading…</p>

  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Total members" value={stats.total_members} />
        <Stat label="Active members" value={stats.active_members} />
        <Stat label="Verified members" value={stats.verified_members} />
        <Stat label="Pending withdrawals" value={stats.pending_withdrawals} />
        <Stat label="Approved withdrawals" value={money(stats.approved_withdrawal_total)} />
        <Stat label="Paid commissions" value={money(stats.paid_commission_total)} />
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Pending withdrawal requests</h3>
            <p style={{ color: 'var(--text-muted)' }}>Awaiting finance review</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Member', 'Amount', 'Method', 'Requested']}
            rows={pending.map((w) => [
              w.member_name,
              money(w.amount),
              w.method,
              new Date(w.requested_at.replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
