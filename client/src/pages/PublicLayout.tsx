import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu } from 'lucide-react'
import { useBodyClass } from '../lib/useBodyClass'
import { ThemeToggle } from '../components/ThemeToggle'

const navLinks = [
  { to: '/marketing-plan', label: 'Marketing Plan' },
  { to: '/rank-plan', label: 'Rank Plan' },
  { to: '/rewards', label: 'Rewards' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  useBodyClass('flex min-h-screen flex-col')
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [body, setBody] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setBody(document.body)
  }, [])

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  const content = (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-700/70 dark:bg-navy-900/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-sm font-black text-accent-400">LX</span>
            <span className="leading-tight">
              <span className="block text-lg font-black tracking-tight text-navy-900">NEXORA</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Marketing &amp; Network Management Platform</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`top-link ${isActive(link.to) ? 'top-link-active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/register" className="btn btn-accent btn-sm hidden sm:inline-block">Join now</Link>
            <button
              type="button"
              className="rounded-lg p-2 text-navy-900 hover:bg-slate-100 md:hidden"
              data-nav-toggle
              aria-expanded={menuOpen}
              aria-controls="public-mobile-nav"
              aria-label="Open menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div
          id="public-mobile-nav"
          className={`${menuOpen ? '' : 'hidden'} border-t border-slate-100 bg-white md:hidden`}
        >
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`top-link block rounded-lg px-3 py-2.5 ${isActive(link.to) ? 'top-link-active' : ''}`}>
                {link.label}
              </Link>
            ))}
            <Link to="/register" className="btn btn-accent mt-2 block w-full text-center sm:hidden">Join now</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-xs font-black text-accent-400">LX</span>
              <span className="font-black text-navy-900">NEXORA</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">Marketing &amp; Network Management Platform</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/marketing-plan" className="hover:text-accent-600">Marketing Plan</Link></li>
              <li><Link to="/rank-plan" className="hover:text-accent-600">Rank Plan</Link></li>
              <li><Link to="/rewards" className="hover:text-accent-600">Rewards</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/terms" className="hover:text-accent-600">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-accent-600">Privacy Policy</Link></li>
              <li><Link to="/income-disclosure" className="hover:text-accent-600">Income Disclosure</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link to="/login" className="hover:text-accent-600">Member login</Link></li>
              <li><Link to="/register" className="hover:text-accent-600">Create account</Link></li>
              <li><Link to="/contact" className="hover:text-accent-600">Support</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} NEXORA. All rights reserved.
        </div>
      </footer>
    </>
  )

  if (!body) return null

  return createPortal(content, body)
}
