import { Outlet } from 'react-router-dom'
import { Shell } from '../../components/Shell'

const NAV = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/withdrawals', label: 'Withdrawal approvals' },
  { to: '/admin/rewards', label: 'Rewards' },
  { to: '/admin/reports', label: 'Platform reports' },
]

export default function AdminLayout() {
  return (
    <Shell items={NAV} title="Platform administration">
      <Outlet />
    </Shell>
  )
}
