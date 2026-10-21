import { NavLink, useNavigate } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
}

export function Shell({ items, title, children }: { items: NavItem[]; title: string; children: React.ReactNode }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('nexora_token')
    localStorage.removeItem('nexora_user')
    navigate('/login')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid var(--border)', padding: '1.8rem 1.2rem', display: 'grid', gap: '0.4rem', alignContent: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }} />
          <span style={{ fontWeight: 800, letterSpacing: '0.3em' }}>NEXORA</span>
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            style={({ isActive }) => ({
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: '1.5rem' }} onClick={logout}>Sign out</button>
      </aside>
      <main style={{ padding: '2.2rem 2.6rem' }}>
        <header style={{ marginBottom: '1.8rem' }}>
          <h1 style={{ fontSize: '1.9rem' }}>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="card-body">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>{value}</p>
      </div>
    </div>
  )
}

export function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="table">
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
