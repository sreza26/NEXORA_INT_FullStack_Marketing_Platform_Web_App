import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { LoginPayload } from '@nexora/shared'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginPayload>({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('nexora_token', data.token)
      localStorage.setItem('nexora_user', JSON.stringify(data.user))
      navigate(data.user.roles.includes('member') ? '/member' : '/admin')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container" style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 12rem)', padding: '3rem 0' }}>
      <form className="card" style={{ width: 'min(440px, 92vw)' }} onSubmit={onSubmit}>
        <header className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
              <span className="logo-mark logo-mark-sm">LX</span>
              <span style={{ fontWeight: 900, color: 'var(--color-navy-900)' }}>NEXORA</span>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-navy-950)' }}>Welcome back</h2>
            <p style={{ color: '#64748b', marginTop: '0.4rem' }}>Log in to your NEXORA account</p>
          </div>
        </header>
        <div className="card-body">
          <label className="label">
            <span className="label-text">Email</span>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Password</span>
            <input className="input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p style={{ color: '#dc2626' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
          <p style={{ color: '#64748b' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--color-accent-600)', fontWeight: 600 }}>Join now</Link>
          </p>
        </div>
      </form>
    </main>
  )
}
