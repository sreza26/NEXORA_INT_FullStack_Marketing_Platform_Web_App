import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main>
      <section className="container" style={{ display: 'grid', gap: '2.4rem', padding: '5rem 0' }}>
        <div style={{ display: 'grid', gap: '1.2rem', maxWidth: '880px' }}>
          <span className="badge">Marketing & Network Management Platform</span>
          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5.6rem)', lineHeight: 1.02, letterSpacing: '-0.03em', color: 'var(--color-navy-950)' }}>
            Build, scale and reward your network with precision.
          </h1>
          <p style={{ color: '#475569', maxWidth: '720px', fontSize: '1.08rem' }}>
            NEXORA unifies referrals, commissions, ranks, salaries, rewards and compliance into one secure platform built for modern network organizations.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem' }}>
            <Link className="btn btn-accent" to="/register">Join now</Link>
            <Link className="btn btn-ghost" to="/login">Log in</Link>
            <Link className="btn btn-ghost" to="/marketing-plan">View marketing plan</Link>
          </div>
        </div>
        <div className="grid grid-3">
          <article className="card">
            <header className="card-header">
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-navy-950)' }}>Smart referrals</h3>
                <p style={{ color: '#64748b', marginTop: '0.4rem' }}>Track your tree with real-time visibility.</p>
              </div>
            </header>
            <div className="card-body">
              <p style={{ color: '#475569' }}>Generate, share and monitor sponsor links with built-in guardrails.</p>
            </div>
          </article>
          <article className="card">
            <header className="card-header">
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-navy-950)' }}>Automated commissions</h3>
                <p style={{ color: '#64748b', marginTop: '0.4rem' }}>Generation-based payouts, fully auditable.</p>
              </div>
            </header>
            <div className="card-body">
              <p style={{ color: '#475569' }}>Ledger-first architecture with approvals, reversals and role-based controls.</p>
            </div>
          </article>
          <article className="card">
            <header className="card-header">
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-navy-950)' }}>Ranks, salary & rewards</h3>
                <p style={{ color: '#64748b', marginTop: '0.4rem' }}>Drive growth with measurable incentives.</p>
              </div>
            </header>
            <div className="card-body">
              <p style={{ color: '#475569' }}>Monthly qualification, rank snapshots and claimable rewards.</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
