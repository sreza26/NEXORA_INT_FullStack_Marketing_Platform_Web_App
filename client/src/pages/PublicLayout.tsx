import { Link, Outlet } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid rgba(226, 232, 240, 0.8)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <span className="logo-mark">LX</span>
            <span style={{ display: 'grid', lineHeight: 1 }}>
              <span style={{ fontWeight: 900, letterSpacing: '-0.01em', color: 'var(--color-navy-900)' }}>NEXORA</span>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#94a3b8' }}>Marketing & Network Management Platform</span>
            </span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', flexWrap: 'wrap' }}>
            <Link to="/marketing-plan" style={{ fontSize: '0.98rem', color: '#475569', fontWeight: 500 }}>Marketing Plan</Link>
            <Link to="/rank-plan" style={{ fontSize: '0.98rem', color: '#475569', fontWeight: 500 }}>Rank Plan</Link>
            <Link to="/rewards" style={{ fontSize: '0.98rem', color: '#475569', fontWeight: 500 }}>Rewards</Link>
            <Link to="/contact" style={{ fontSize: '0.98rem', color: '#475569', fontWeight: 500 }}>Contact</Link>
            <Link className="btn btn-ghost" to="/login">Log in</Link>
            <Link className="btn btn-accent" to="/register">Join now</Link>
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ borderTop: '1px solid var(--border)', background: '#fff', marginTop: '4rem' }}>
        <div className="container" style={{ display: 'grid', gap: '2rem', padding: '2.8rem 0', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <span className="logo-mark logo-mark-sm">LX</span>
              <span style={{ fontWeight: 900, color: 'var(--color-navy-900)' }}>NEXORA</span>
            </div>
            <p style={{ marginTop: '0.8rem', color: '#64748b', maxWidth: '320px' }}>Marketing & Network Management Platform</p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>Platform</h4>
            <ul style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem', listStyle: 'none' }}>
              <li><Link to="/marketing-plan" style={{ color: '#475569' }}>Marketing Plan</Link></li>
              <li><Link to="/rank-plan" style={{ color: '#475569' }}>Rank Plan</Link></li>
              <li><Link to="/rewards" style={{ color: '#475569' }}>Rewards</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>Legal</h4>
            <ul style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem', listStyle: 'none' }}>
              <li><Link to="/terms" style={{ color: '#475569' }}>Terms &amp; Conditions</Link></li>
              <li><Link to="/privacy" style={{ color: '#475569' }}>Privacy Policy</Link></li>
              <li><Link to="/income-disclosure" style={{ color: '#475569' }}>Income Disclosure</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8' }}>Account</h4>
            <ul style={{ display: 'grid', gap: '0.6rem', marginTop: '0.9rem', listStyle: 'none' }}>
              <li><Link to="/login" style={{ color: '#475569' }}>Log in</Link></li>
              <li><Link to="/register" style={{ color: '#475569' }}>Join now</Link></li>
              <li><Link to="/contact" style={{ color: '#475569' }}>Contact</Link></li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.8rem', padding: '1rem 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            <span>© {new Date().getFullYear()} NEXORA. All rights reserved.</span>
            <span>Marketing & Network Management Platform</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
