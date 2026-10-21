import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import type { RegisterPayload } from '@nexora/shared'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    sponsor_code: params.get('ref') ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      localStorage.setItem('nexora_token', data.token)
      localStorage.setItem('nexora_user', JSON.stringify(data.user))
      navigate('/member')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to register')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container" style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 12rem)', padding: '3rem 0' }}>
      <form className="card" style={{ width: 'min(520px, 92vw)' }} onSubmit={onSubmit}>
        <header className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
              <span className="logo-mark logo-mark-sm">LX</span>
              <span style={{ fontWeight: 900, color: 'var(--color-navy-900)' }}>NEXORA</span>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-navy-950)' }}>Create your account</h2>
            <p style={{ color: '#64748b', marginTop: '0.4rem' }}>Join the NEXORA network</p>
          </div>
        </header>
        <div className="card-body">
          <label className="label">
            <span className="label-text">Full name</span>
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Email</span>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Phone</span>
            <input className="input" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Sponsor code</span>
            <input className="input" value={form.sponsor_code}
              onChange={(e) => setForm({ ...form, sponsor_code: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Password</span>
            <input className="input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="label">
            <span className="label-text">Confirm password</span>
            <input className="input" type="password" required value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          </label>
          {error && <p style={{ color: '#dc2626' }}>{error}</p>}
          <button className="btn btn-accent" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Join now'}
          </button>
          <p style={{ color: '#64748b' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--color-accent-600)', fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </form>
    </main>
  )
}
