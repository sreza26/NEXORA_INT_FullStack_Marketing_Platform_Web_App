import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export interface NavItem {
  to: string
  label: string
  icon?: React.ReactNode
  /** Permission required to see and open this entry. */
  permission?: string
  /** Any one of these permissions is enough. */
  anyPermission?: string[]
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

export function Shell({
  groups,
  title,
  variant = 'member',
  badge,
  user,
  children,
}: {
  groups: NavGroup[]
  title: string
  variant?: 'member' | 'admin'
  badge?: React.ReactNode
  user?: { name: string; subtitle: string }
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function logout() {
    localStorage.removeItem('nexora_token')
    localStorage.removeItem('nexora_user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col bg-navy-950 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <NavLink to="/" className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-navy-950 ${
                variant === 'admin' ? 'bg-gold-400' : 'bg-accent-500'
              }`}
            >
              LX
            </span>
            <div className="leading-tight">
              <span className="block font-black text-white">NEXORA</span>
              <span
                className={`block text-[10px] uppercase tracking-widest ${
                  variant === 'admin' ? 'text-gold-400' : 'text-slate-500'
                }`}
              >
                {variant === 'admin' ? 'Admin Console' : 'Marketing & Network Management Platform'}
              </span>
            </div>
          </NavLink>
          <button
            type="button"
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm" aria-label={variant === 'admin' ? 'Admin console' : 'Member portal'}>
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 first:pt-0">
                {group.heading}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? 'side-link-active' : ''}`}>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-3">
          {variant === 'admin' && (
            <NavLink to="/member" className="side-link">
              Member portal
            </NavLink>
          )}
          <button type="button" onClick={logout} className="side-link w-full text-left">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </button>

          {variant === 'admin' ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Console</span>
          ) : (
            <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">{badge}</div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold ${
                    variant === 'admin' ? 'text-gold-400' : 'text-accent-400'
                  }`}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-semibold text-navy-900">{user.name}</p>
                  <p className="text-[11px] text-slate-400">{user.subtitle}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <h1 className="mb-6 text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
          {children}
        </main>
      </div>
    </div>
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

export function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
