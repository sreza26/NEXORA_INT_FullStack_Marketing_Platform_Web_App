import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import type { RegisterPayload } from '@nexora/shared'

export default function RegisterPage() {
  const navigate = useNavigate()
  usePageTitle('Create account')

  const [params] = useSearchParams()
  const sponsorCode = params.get('ref') ?? ''
  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    password_confirmation: '',
    sponsor_code: sponsorCode,
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
    <div className="card card-pad">
      <h1 className="text-2xl font-bold text-navy-900">Join NEXORA</h1>
      <p className="mt-1 text-sm text-slate-500">Create your account and start building your network.</p>

      {sponsorCode && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/10 px-3.5 py-2.5 text-sm">
          <span className="text-slate-700">Sponsor code <strong className="font-bold text-navy-900">{sponsorCode}</strong></span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input
            className="input"
            type="text"
            id="name"
            name="name"
            required
            maxLength={120}
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <p className="hint">Enter your full legal name as it appears on your government-issued ID.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              className="input"
              type="email"
              id="email"
              name="email"
              required
              maxLength={160}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="hint">Used to sign in and receive payout notifications.</p>
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input
              className="input"
              type="tel"
              id="phone"
              name="phone"
              maxLength={30}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <p className="hint">Include your country code. Visible only to administrators.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="country">Country (optional)</label>
            <input
              className="input"
              type="text"
              id="country"
              name="country"
              maxLength={80}
              value={form.country ?? ''}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <p className="hint">Where you live, used for compliance checks.</p>
          </div>
          <div>
            <label className="label" htmlFor="sponsor_code">Sponsor code (optional)</label>
            <input
              className="input uppercase"
              type="text"
              id="sponsor_code"
              name="sponsor_code"
              maxLength={32}
              placeholder="Optional"
              value={form.sponsor_code}
              onChange={(e) => setForm({ ...form, sponsor_code: e.target.value })}
            />
            <p className="hint">The member code of the person who invited you. Leave empty if you have no sponsor.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              className="input"
              type="password"
              id="password"
              name="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-slate-400">Minimum 8 characters with letters and numbers.</p>
          </div>
          <div>
            <label className="label" htmlFor="password_confirmation">Confirm password</label>
            <input
              className="input"
              type="password"
              id="password_confirmation"
              name="password_confirmation"
              required
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            />
            <p className="hint">Must match the password above.</p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="terms"
            value="1"
            required
            className="mt-0.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
          />
          <span>
            I agree to the
            <Link to="/terms" className="font-semibold text-accent-600">Terms of Service</Link>
            and
            <Link to="/privacy" className="font-semibold text-accent-600">Privacy Policy</Link>.
          </span>
        </label>
        <p className="hint">Required. You confirm you have read the marketing plan and income disclosure.</p>

        {error && <p className="flash-err">{error}</p>}

        <button type="submit" className="btn btn-accent w-full" disabled={busy}>
          {busy ? 'Create account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already a member?
        <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-500">Log in</Link>
      </p>
    </div>
  )
}
