import { Link, Outlet } from 'react-router-dom'

export default function GuestLayout() {
  return (
    <div className="hero-grid min-h-screen bg-surface">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-sm font-black text-accent-400">LX</span>
          <span className="leading-tight">
            <span className="block text-xl font-black tracking-tight text-navy-900">NEXORA</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Marketing &amp; Network Management Platform</span>
          </span>
        </Link>

        <div className="w-full max-w-md">
          <Outlet />
        </div>

        <p className="mt-8 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} NEXORA &middot;
          <Link to="/terms" className="hover:text-accent-600">Terms</Link> &middot;
          <Link to="/privacy" className="hover:text-accent-600">Privacy</Link>
        </p>
      </div>
    </div>
  )
}
