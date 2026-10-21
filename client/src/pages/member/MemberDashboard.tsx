import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Shell, Stat, Table } from '../../components/Shell'
import type { Referral } from '@nexora/shared'

const NAV = [
  { to: '/member', label: 'Dashboard' },
  { to: '/member/network', label: 'My network' },
  { to: '/member/commissions', label: 'Commissions' },
  { to: '/member/wallet', label: 'Wallet & ledger' },
  { to: '/member/withdrawals', label: 'Withdrawals' },
  { to: '/member/rewards', label: 'Rewards & rank' },
]

export default function MemberDashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          api.get('/member/summary'),
          api.get('/member/referrals'),
        ])
        setSummary(s.data)
        setReferrals(r.data)
      } catch (err: any) {
        setError(err.response?.data?.message ?? 'Unable to load dashboard')
      }
    }
    load()
  }, [])

  if (error) return <div className="container" style={{ padding: '3rem' }}>{error}</div>
  if (!summary) return <div className="container" style={{ padding: '3rem' }}>Loading…</div>

  return (
    <Shell items={NAV} title={`Welcome back, ${summary.user.name}`}>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <Stat label="Wallet balance" value={money(summary.wallet.balance)} />
        <Stat label="Direct referrals" value={summary.direct_referrals} />
        <Stat label="Total network" value={summary.total_network} />
        <Stat label="Team volume" value={money(summary.team_volume)} />
        <Stat label="Current rank" value={summary.rank?.name ?? 'Unranked'} />
        <Stat label="Pending withdrawals" value={summary.pending_withdrawals} />
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Direct referrals</h3>
            <p style={{ color: 'var(--text-muted)' }}>Your first line of the network</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['Name', 'Member code', 'Status', 'Joined']}
            rows={referrals.map((r) => [r.name, r.member_code, r.status, new Date(r.joined_at).toLocaleDateString()])}
          />
        </div>
      </div>
    </Shell>
  )
}
