import { Link, Outlet } from 'react-router-dom'
import { useBodyClass } from '../../lib/useBodyClass'
import { FooterCredit } from '../../components/FooterCredit'
import { ThemeToggle } from '../../components/ThemeToggle'

export default function GuestLayout() {
  useBodyClass('hero-grid min-h-screen bg-surface dark:bg-navy-950')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md items-start justify-between mb-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-sm font-black text-accent-400">NX</span>
          <span className="leading-tight">
            <span className="block text-xl font-black tracking-tight text-navy-900 dark:text-white">NEXORA INT</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Marketing &amp; Network Management Platform</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <Outlet />
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-500 sm:flex-row">
        <p>
          &copy; {new Date().getFullYear()} NEXORA INT &middot;
          <Link to="/terms" className="hover:text-accent-600 dark:hover:text-accent-400">Terms</Link> &middot;
          <Link to="/privacy" className="hover:text-accent-600 dark:hover:text-accent-400">Privacy</Link>
        </p>
        <FooterCredit />
      </div>
    </div>
  )
}
