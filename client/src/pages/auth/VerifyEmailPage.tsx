import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function VerifyEmailPage() {
  usePageTitle('Verify email')
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const token = search.get('token') ?? ''

  const [verified, setVerified] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    busySet(true)
    api
      .get('/api/auth/email/verify', { params: { token } })
      .then((res) => {
        setVerified(true)
        setStatus(res.data.status)
      })
      .catch((err) => {
        setError(err.response?.data?.message ?? 'The verification link is invalid or has expired.')
      })
      .finally(() => busySet(false))
  }, [token])

  function busySet(v: boolean) {
    setBusy(v)
  }

  async function resend() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const res = await api.post('/api/auth/email/verification-notification')
      setStatus(res.data.status)
      if (res.data.verification_url) {
        setStatus(`${res.data.status} (dev link: <a href="${res.data.verification_url}" target="_blank" class="text-accent-600 underline">${res.data.verification_url}</a>)`)
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to resend verification link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/10">
        <svg className="h-6 w-6 text-accent-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </span>
      <h1 className="mt-4 text-2xl font-bold text-navy-900">Verify your email</h1>
      <p className="mt-2 text-sm text-slate-500">
        We sent a verification link to <span className="text-navy-900 font-medium">{search.get('email') ?? ''}</span>.
        Click the link to activate your account.
      </p>

      <div className="mt-6 space-y-3">
        {!verified && token && (
          <button type="button" className="btn btn-outline w-full" onClick={() => {}} disabled>
            Verifying…
          </button>
        )}
        <button type="button" className="btn btn-outline w-full" disabled={busy} onClick={resend}>
          {busy ? 'Sending…' : 'Resend verification email'}
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => navigate('/login')}>
          Log out
        </button>
      </div>

      {error && <p className="flash-err mt-4">{error}</p>}
      {status && verified ? <p className="flash-ok mt-4">{status}</p> : null}
      {status && !verified && <p className="text-sm text-slate-500 mt-4">{status}</p>}
    </div>
  )
}