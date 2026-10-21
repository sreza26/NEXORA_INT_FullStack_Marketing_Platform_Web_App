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
      navigate(data.user.roles.includes('member') ? '/member' : '/admin')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form className="card" style={{ width: 'min(440px, 92vw)' }} onSubmit={onSubmit}>
        <header className="card-header">
          <div>
            <h2>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)' }}>Sign in to your NEXORA account</p>
          </div>
        </header>
        <div className="card-body">
          <label className="label">
            Email
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label">
            Password
            <input className="input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p style={{ color: 'var(--text-muted)' }}>
            No account? <Link to="/register" style={{ color: 'var(--primary)' }}>Register</Link>
          </p>
        </div>
      </form>
    </main>
  )
}
