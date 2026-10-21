import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Shell, Stat, Table } from '../../components/Shell'
import type { Commission } from '@nexora/shared'

const NAV = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/withdrawals', label: 'Withdrawal approvals' },
  { to: '/admin/reports', label: 'Platform reports' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [pending, setPending] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([
          api.get('/admin/summary'),
          api.get('/admin/withdrawals?status=pending'),
        ])
        setStats(s.data)
        setPending(p.data)
      } catch (err: any) {
        setError(err.response?.data?.message ?? 'Unable to load admin data')
      }
    }
    load()
  }, [])

  if (error) return <div className="container" style={{ padding: '3rem' }}>{error}</div>
  if (!stats) return <div className="container" style={{ padding: '3rem' }}>Loading…</div>

  return (
    <Shell items={NAV} title="Platform administration">
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Total members" value={stats.total_members} />
        <Stat label="Active members" value={stats.active_members} />
        <Stat label="Verified members" value={stats.verified_members} />
        <Stat label="Pending withdrawals" value={stats.pending_withdrawals} />
        <Stat label="Approved withdrawal total" value={money(stats.approved_withdrawal_total)} />
        <Stat label="Paid commission total" value={money(stats.paid_commission_total)} />
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
            rows={pending.map((w) => [w.member_name, money(w.amount), w.method, new Date(w.requested_at).toLocaleDateString()])}
          />
        </div>
      </div>
    </Shell>
  )
}
