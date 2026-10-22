import { Outlet } from 'react-router-dom'
import { Shell, type NavGroup } from '../../components/Shell'
import { hasAnyPermission, hasPermission, useAuth } from '../../lib/auth'

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/members', label: 'Members', permission: 'members.view' },
    ],
  },
  {
    heading: 'Money Movement',
    items: [
      { to: '/admin/withdrawals', label: 'Withdrawals', permission: 'withdrawals.view' },
    ],
  },
  {
    heading: 'Compensation',
    items: [
      { to: '/admin/rewards', label: 'Travel Rewards', permission: 'rewards.manage' },
    ],
  },
  {
    heading: 'Governance',
    items: [
      { to: '/admin/reports', label: 'Reports', permission: 'reports.view' },
    ],
  },
]

export default function AdminLayout() {
  const { user } = useAuth()

  // Hide console entries the signed-in account is not allowed to open. The
  // server enforces the same permissions, this only keeps the menu honest.
  const groups: NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.anyPermission) return hasAnyPermission(user, item.anyPermission)
      return hasPermission(user, item.permission)
    }),
  }))

  return (
    <Shell
      groups={groups}
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
