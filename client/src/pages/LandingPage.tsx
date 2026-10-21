import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main>
      <header className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '2.6rem', height: '2.6rem', borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }} />
          <span style={{ fontWeight: 800, letterSpacing: '0.4em', textTransform: 'uppercase' }}>NEXORA</span>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link className="btn btn-ghost" to="/login">Sign in</Link>
          <Link className="btn btn-primary" to="/register">Get started</Link>
        </nav>
      </header>
      <section className="container" style={{ display: 'grid', gap: '2rem', padding: '6rem 0' }}>
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '880px' }}>
          <span className="badge">Marketing & Network Management Platform</span>
          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 0.98 }}>
            Build, scale and reward your network with precision.
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '720px', fontSize: '1.1rem' }}>
            NEXORA unifies referrals, commissions, ranks, salaries, rewards and compliance into one secure platform built for modern MLM organizations.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link className="btn btn-primary" to="/register">Create your account</Link>
            <Link className="btn btn-ghost" to="/login">Member login</Link>
          </div>
        </div>
        <div className="grid grid-3">
          <article className="card">
            <header className="card-header">
              <div>
                <h3>Smart referrals</h3>
                <p style={{ color: 'var(--text-muted)' }}>Track your tree with real-time visibility.</p>
              </div>
            </header>
            <div className="card-body">
              <p>Generate, share and monitor sponsor links with built-in guardrails.</p>
            </div>
          </article>
          <article className="card">
            <header className="card-header">
              <div>
                <h3>Automated commissions</h3>
                <p style={{ color: 'var(--text-muted)' }}>Generation-based payouts, fully auditable.</p>
              </div>
            </header>
            <div className="card-body">
              <p>Ledger-first architecture with approvals, reversals and role-based controls.</p>
            </div>
          </article>
          <article className="card">
            <header className="card-header">
              <div>
                <h3>Ranks, salary & rewards</h3>
                <p style={{ color: 'var(--text-muted)' }}>Drive growth with measurable incentives.</p>
              </div>
            </header>
            <div className="card-body">
              <p>Monthly qualification, rank snapshots and claimable rewards.</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
