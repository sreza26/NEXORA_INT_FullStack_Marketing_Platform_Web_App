import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import type { LoginPayload } from '@nexora/shared'

export default function LoginPage() {
  const navigate = useNavigate()
  usePageTitle('Log in')

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
    <div className="card card-pad">
      <h1 className="text-2xl font-bold text-navy-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Log in to your NEXORA member account.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input
            className="input"
            type="email"
            id="email"
            name="email"
            required
            autoFocus
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <p className="hint">Use the email address you registered with.</p>
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            type="password"
            id="password"
            name="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="hint">Enter the password you set when you created your account.</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              name="remember"
              value="1"
              className="rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            Remember me
          </label>
          <a href="/login" className="font-semibold text-accent-600 hover:text-accent-500">Forgot password?</a>
        </div>
        <p className="hint">Keeps you signed in on this device.</p>

        {error && <p className="flash-err">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Log in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to NEXORA?
        <Link to="/register" className="font-semibold text-accent-600 hover:text-accent-500">Create an account</Link>
      </p>
    </div>
  )
}
