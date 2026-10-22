import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  usePageTitle('Forgot password')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setStatus(res.data.status)
      if (res.data.reset_url) {
        setStatus(`${res.data.status} (dev link: <a href="${res.data.reset_url}" target="_blank" class="text-accent-600 underline">${res.data.reset_url}</a>)`)
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to send reset link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad">
      <h1 className="text-2xl font-bold text-navy-900">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500">Enter your email and we will send you a reset link.</p>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="hint">We will send a one-time reset link to this address.</p>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {error && <p className="flash-err mt-4">{error}</p>}
      {status && <p className="flash-ok mt-4" dangerouslySetInnerHTML={{ __html: status }} />}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-500">Back to login</Link>
      </p>
    </div>
  )
}