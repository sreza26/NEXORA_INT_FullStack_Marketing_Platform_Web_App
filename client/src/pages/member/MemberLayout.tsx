import { Outlet } from 'react-router-dom'
import { Shell, type NavGroup } from '../../components/Shell'
import { useAuth } from '../../lib/auth'

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/member', label: 'Dashboard' },
      { to: '/member/network', label: 'My Network' },
    ],
  },
  {
    heading: 'Earnings',
    items: [
      { to: '/member/commissions', label: 'Commissions' },
      { to: '/member/wallet', label: 'Wallet & Ledger' },
      { to: '/member/withdrawals', label: 'Withdrawals' },
      { to: '/member/rewards', label: 'Rewards' },
    ],
  },
]

export default function MemberLayout() {
  const { user } = useAuth()

  return (
    <Shell
      groups={NAV}
      title="Member portal"
      user={{
        name: user?.name ?? 'Member',
        subtitle: user?.member_code ?? '',
      }}
    >
      <Outlet />
    </Shell>
  )
}
