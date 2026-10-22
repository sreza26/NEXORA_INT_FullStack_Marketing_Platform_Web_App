import { Outlet } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpen,
  Clock,
  Coins,
  FileText,
  Gift,
  Layers,
  LayoutDashboard,
  Megaphone,
  Network,
  Scale,
  ScrollText,
  Settings,
  Shield,
  TicketCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { Shell, type NavGroup } from '../../components/Shell'
import { useAuth } from '../../lib/auth'
import { useBodyClass } from '../../lib/useBodyClass'

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4 shrink-0" />, end: true },
      { to: '/admin/network', label: 'Network Explorer', icon: <Network className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'People',
    permission: 'members.view',
    items: [
      { to: '/admin/members', label: 'Members', icon: <Users className="h-4 w-4 shrink-0" />, permission: 'members.view' },
      {
        to: '/admin/verifications',
        label: 'Verifications',
        icon: <BadgeCheck className="h-4 w-4 shrink-0" />,
        permission: 'members.verify_identity',
      },
      { to: '/admin/roles', label: 'Roles', icon: <Shield className="h-4 w-4 shrink-0" />, permission: 'roles.manage' },
    ],
  },
  {
    heading: 'Money Movement',
    permission: 'transactions.view',
    items: [
      {
        to: '/admin/transactions',
        label: 'Transactions',
        icon: <ArrowLeftRight className="h-4 w-4 shrink-0" />,
        permission: 'transactions.view',
      },
      { to: '/admin/ledger', label: 'Ledger', icon: <BookOpen className="h-4 w-4 shrink-0" />, permission: 'ledger.view' },
      {
        to: '/admin/deposits',
        label: 'Deposits',
        icon: <ArrowDownToLine className="h-4 w-4 shrink-0" />,
        permission: 'deposits.view',
      },
      {
        to: '/admin/withdrawals',
        label: 'Withdrawals',
        icon: <ArrowUpFromLine className="h-4 w-4 shrink-0" />,
        permission: 'withdrawals.view',
      },
      {
        to: '/admin/reconciliation',
        label: 'Reconciliation',
        icon: <Scale className="h-4 w-4 shrink-0" />,
        permission: 'reconciliation.view',
      },
    ],
  },
  {
    heading: 'Compensation',
    permission: 'commissions.view',
    items: [
      {
        to: '/admin/compensation-plans',
        label: 'Compensation Plans',
        icon: <Layers className="h-4 w-4 shrink-0" />,
        permission: 'plans.manage',
      },
      {
        to: '/admin/commissions',
        label: 'Commissions',
        icon: <Coins className="h-4 w-4 shrink-0" />,
        permission: 'commissions.view',
      },
      { to: '/admin/ranks', label: 'Ranks', icon: <Trophy className="h-4 w-4 shrink-0" />, permission: 'ranks.view' },
      {
        to: '/admin/rank-reports',
        label: 'Rank Reports',
        icon: <BarChart3 className="h-4 w-4 shrink-0" />,
        permission: 'ranks.view',
      },
      { to: '/admin/salary', label: 'Salary', icon: <Banknote className="h-4 w-4 shrink-0" />, permission: 'salary.view' },
      {
        to: '/admin/rewards',
        label: 'Travel Rewards',
        icon: <Gift className="h-4 w-4 shrink-0" />,
        permission: 'rewards.manage',
      },
      {
        to: '/admin/reward-claims',
        label: 'Reward Claims',
        icon: <TicketCheck className="h-4 w-4 shrink-0" />,
        permission: 'rewards.claims.review',
      },
    ],
  },
  {
    heading: 'Governance',
    items: [
      {
        to: '/admin/reports',
        label: 'Reports',
        icon: <FileText className="h-4 w-4 shrink-0" />,
        permission: 'reports.view',
      },
      {
        to: '/admin/announcements',
        label: 'Announcements',
        icon: <Megaphone className="h-4 w-4 shrink-0" />,
        permission: 'announcements.manage',
      },
      {
        to: '/admin/audit-logs',
        label: 'Audit Logs',
        icon: <ScrollText className="h-4 w-4 shrink-0" />,
        permission: 'audit.view',
      },
      {
        to: '/admin/jobs',
        label: 'Scheduled Jobs',
        icon: <Clock className="h-4 w-4 shrink-0" />,
        permission: 'jobs.view',
      },
      {
        to: '/admin/settings',
        label: 'Settings',
        icon: <Settings className="h-4 w-4 shrink-0" />,
        permission: 'settings.manage',
      },
    ],
  },
]

export default function AdminLayout() {
  useBodyClass('bg-surface')
  const { user } = useAuth()

  const roleLabels = user?.role_labels?.join(', ') || user?.role || 'Staff'

  return (
    <Shell
      groups={NAV}
      variant="admin"
      account={user}
      subtitle={roleLabels}
      footerLinks={[{ to: '/member', label: 'Member portal', icon: <UserRound className="h-4 w-4 shrink-0" /> }]}
    >
      <Outlet />
    </Shell>
  )
}
