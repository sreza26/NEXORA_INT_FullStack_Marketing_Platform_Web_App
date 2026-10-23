import { Fragment, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { hasAnyPermission, hasPermission, type AuthUser } from '../lib/auth'

export interface NavItem {
  to: string
  label: string
  icon?: React.ReactNode
  /** Permission required to see and open this entry. */
  permission?: string
  /** Any one of these permissions is enough. */
  anyPermission?: string[]
  /** Match the route exactly instead of by prefix. */
  end?: boolean
  /** Count rendered as a pill on the right hand side of the entry. */
  badge?: number
}

export interface NavGroup {
  heading: string
  items: NavItem[]
  /** Permission that gates the whole group, matching the Laravel wrappers. */
  permission?: string
}

export interface ShellProps {
  groups: NavGroup[]
  variant?: 'member' | 'admin'
  /** Signed-in account. Drives permission gating and the header block. */
  account: AuthUser | null
  /** Secondary line under the account name (member code, role labels). */
  subtitle?: string
  /** Rendered on the left of the header (verification and rank badges). */
  headerBadges?: React.ReactNode
  /** Rendered on the right of the header, before the account block. */
  headerActions?: React.ReactNode
  /** Extra entries rendered above the log out button in the sidebar. */
  footerLinks?: NavItem[]
  /** Banner rendered between the header and the page content. */
  banner?: React.ReactNode
  children: React.ReactNode
}

export function isNavItemVisible(item: NavItem, account: AuthUser | null): boolean {
  if (item.permission) return hasPermission(account, item.permission)
  if (item.anyPermission?.length) return hasAnyPermission(account, item.anyPermission)
  return true
}

export function Shell({
  groups,
  variant = 'member',
  account,
  subtitle = '',
  headerBadges,
  headerActions,
  footerLinks = [],
  banner,
  children,
}: ShellProps) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = variant === 'admin'
  const name = account?.name ?? 'Member'

  function logout() {
    localStorage.removeItem('nexora_token')
    localStorage.removeItem('nexora_user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col bg-navy-950 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <NavLink to="/" className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-navy-950 ${
                isAdmin ? 'bg-gold-400' : 'bg-accent-500'
              }`}
            >
              LX
            </span>
            <div className="leading-tight">
              <span className="block font-black text-white">NEXORA</span>
              <span
                className={`block text-[10px] uppercase tracking-widest ${
                  isAdmin ? 'text-gold-400' : 'text-slate-500'
                }`}
              >
                {isAdmin ? 'Admin Console' : 'Marketing & Network Management Platform'}
              </span>
            </div>
          </NavLink>
          <button
            type="button"
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm"
          aria-label={isAdmin ? 'Admin console' : 'Member portal'}
        >
          {groups.map((group) => {
            if (group.permission && !hasPermission(account, group.permission)) return null
            const items = group.items.filter((item) => isNavItemVisible(item, account))
            if (items.length === 0) return null
            return (
              <Fragment key={group.heading}>
                <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 first:pt-0">
                  {group.heading}
                </p>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `side-link ${isActive ? 'side-link-active' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-navy-950">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </Fragment>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-3">
          {footerLinks.map((item) => (
            <NavLink key={item.to} to={item.to} className="side-link">
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <button type="button" onClick={logout} className="side-link w-full text-left">
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {isAdmin ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Console</span>
          ) : (
            <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">{headerBadges}</div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {headerActions}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold ${
                  isAdmin ? 'text-gold-400' : 'text-accent-400'
                }`}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold text-navy-900">{name}</p>
                <p className="text-[11px] text-slate-400">{subtitle}</p>
              </div>
            </div>
          </div>
        </header>

        {banner}

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

/**
 * Notification bell with an unread counter, matching the Laravel header.
 */
export function NotificationBell({ count }: { count: number }) {
  return (
    <NavLink
      to="/member/notifications"
      className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  )
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  )
}

export function Table({
  head,
  rows,
  align,
}: {
  head: string[]
  rows: React.ReactNode[][]
  /** Optional per-column alignment, e.g. `['left', 'right']` for money columns. */
  align?: ('left' | 'right')[]
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={align?.[i] === 'right' ? 'text-right' : undefined}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className={align?.[j] === 'right' ? 'text-right' : undefined}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
