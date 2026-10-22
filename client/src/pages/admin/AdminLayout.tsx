import { Outlet } from 'react-router-dom'
import { Shell, type NavGroup } from '../../components/Shell'
import { useAuth } from '../../lib/auth'

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/members', label: 'Members' },
    ],
  },
  {
    heading: 'Money Movement',
    items: [
      { to: '/admin/withdrawals', label: 'Withdrawals' },
    ],
  },
  {
    heading: 'Compensation',
    items: [
      { to: '/admin/rewards', label: 'Travel Rewards' },
    ],
  },
  {
    heading: 'Governance',
    items: [
      { to: '/admin/reports', label: 'Reports' },
    ],
  },
]

export default function AdminLayout() {
  const { user } = useAuth()

  return (
    <Shell
      groups={NAV}
      title="Admin console"
      variant="admin"
      user={{
        name: user?.name ?? 'Admin',
        subtitle: user?.role ?? 'Staff',
      }}
    >
      <Outlet />
    </Shell>
  )
}
