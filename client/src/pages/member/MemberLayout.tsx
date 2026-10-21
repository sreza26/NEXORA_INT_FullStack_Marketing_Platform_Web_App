import { Outlet } from 'react-router-dom'
import { Shell } from '../../components/Shell'

const NAV = [
  { to: '/member', label: 'Dashboard' },
  { to: '/member/network', label: 'My network' },
  { to: '/member/commissions', label: 'Commissions' },
  { to: '/member/wallet', label: 'Wallet & ledger' },
  { to: '/member/withdrawals', label: 'Withdrawals' },
  { to: '/member/rewards', label: 'Rewards & rank' },
]

export default function MemberLayout() {
  return (
    <Shell items={NAV} title="Member portal">
      <Outlet />
    </Shell>
  )
}
