import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function ResetPasswordPage() {
  usePageTitle('Choose new password')
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const email = search.get('email') ?? ''

  const [form, setForm] = useState({ email: email, password: '', password_confirmation: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setForm((f) => ({ ...f, email }))
  }, [email])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      setStatus(res.data.status)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to reset password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad">
      <h1 className="text-2xl font-bold text-navy-900">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Your new password must be at least 8 characters with letters and numbers.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input className="input" type="email" id="email" name="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <p className="hint">Use the email address the reset link was sent to.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input className="input" type="password" id="password" name="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="hint">At least 8 characters with letters and numbers.</p>
          </div>
          <div>
            <label className="label" htmlFor="password_confirmation">Confirm password</label>
            <input className="input" type="password" id="password_confirmation" name="password_confirmation" required autoComplete="new-password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
            <p className="hint">Must match the password above.</p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      {error && <p className="flash-err mt-4">{error}</p>}
      {status && <p className="flash-ok mt-4">{status}</p>}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-500">Back to login</Link>
      </p>
    </div>
  )
}