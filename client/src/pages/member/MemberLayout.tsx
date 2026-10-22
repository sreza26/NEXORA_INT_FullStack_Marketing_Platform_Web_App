import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  Bell,
  Coins,
  Gift,
  LayoutDashboard,
  Link2,
  Lock,
  Megaphone,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { NotificationBell, Shell, type NavGroup } from '../../components/Shell'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useBodyClass } from '../../lib/useBodyClass'

const NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/member', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4 shrink-0" />, end: true },
      { to: '/member/rank-progress', label: 'Rank Progress', icon: <Trophy className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'Network',
    items: [
      { to: '/member/referrals', label: 'My Referral Link', icon: <Link2 className="h-4 w-4 shrink-0" /> },
      { to: '/member/team', label: 'My Team', icon: <Users className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'Earnings',
    items: [
      { to: '/member/transactions', label: 'Transactions', icon: <ArrowLeftRight className="h-4 w-4 shrink-0" /> },
      { to: '/member/commissions', label: 'Commissions', icon: <Coins className="h-4 w-4 shrink-0" /> },
      { to: '/member/salary', label: 'Salary', icon: <Banknote className="h-4 w-4 shrink-0" /> },
      { to: '/member/rewards', label: 'Rewards', icon: <Gift className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'Wallet',
    items: [
      { to: '/member/wallet', label: 'Wallet & Ledger', icon: <Wallet className="h-4 w-4 shrink-0" /> },
      { to: '/member/deposits', label: 'Deposits', icon: <ArrowDownToLine className="h-4 w-4 shrink-0" /> },
      { to: '/member/withdrawals', label: 'Withdrawals', icon: <ArrowUpFromLine className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'Account',
    items: [
      { to: '/member/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4 shrink-0" /> },
      { to: '/member/verification', label: 'Identity Verification', icon: <BadgeCheck className="h-4 w-4 shrink-0" /> },
      { to: '/member/profile', label: 'Profile', icon: <UserRound className="h-4 w-4 shrink-0" /> },
      { to: '/member/security', label: 'Security', icon: <Lock className="h-4 w-4 shrink-0" /> },
    ],
  },
  {
    heading: 'Staff',
    items: [
      {
        to: '/admin',
        label: 'Admin Console',
        icon: <ShieldCheck className="h-4 w-4 shrink-0" />,
        permission: 'members.view',
      },
    ],
  },
]

interface Announcement {
  id: number
  title: string
  body: string
  severity: string
}

function humaniseStatus(value?: string): string {
  if (!value) return 'Unverified'
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export default function MemberLayout() {
  useBodyClass('bg-surface')
  const { user } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // The Laravel layout renders the unread count and the published
  // announcements on every request, so both are refreshed per navigation.
  useEffect(() => {
    let active = true
    api
      .get('/member/notifications/unread-count')
      .then((res) => {
        if (active) setUnread(res.data?.count ?? 0)
      })
      .catch(() => undefined)
    api
      .get('/member/announcements')
      .then((res) => {
        if (active) setAnnouncements(res.data?.announcements ?? [])
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [location.pathname])

  const verification = user?.verification_status ?? 'unverified'
  const rankName = user?.current_rank?.name

  const headerBadges = (
    <>
      <span className={`badge ${verification === 'verified' ? 'badge-success' : 'badge-warn'}`}>
        {humaniseStatus(verification)}
      </span>
      {rankName && <span className="badge badge-info">{rankName}</span>}
    </>
  )

  const banner = announcements.length > 0 && (
    <div className="space-y-2 px-4 pt-4 sm:px-6">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="flash-ok flex items-start gap-2">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{announcement.title}</p>
            <p className="text-emerald-700/90">{announcement.body}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.to === '/member/notifications'
        ? { ...item, badge: unread }
        : item,
    ),
  }))

  return (
    <Shell
      groups={nav}
      variant="member"
      account={user}
      subtitle={user?.member_code ?? ''}
      headerBadges={headerBadges}
      headerActions={<NotificationBell count={unread} />}
      banner={banner}
    >
      <Outlet />
    </Shell>
  )
}
