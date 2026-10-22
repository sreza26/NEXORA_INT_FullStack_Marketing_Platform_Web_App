import { useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Security() {
  usePageTitle('Security')
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.put('/member/security/password', form)
      setMessage('Password updated.')
      setForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update password')
    }
  }

  const user = JSON.parse(localStorage.getItem('nexora_user') || '{}')

  return (
    <>
      <div>
        <h1 className="page-title">Security</h1>
        <p className="section-sub">Manage your password and account safety.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="card card-pad space-y-4">
          <h2 className="font-bold text-navy-900">Change password</h2>

          <div>
            <label className="label" htmlFor="current_password">Current password</label>
            <input className="input" type="password" id="current_password" required autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
            <p className="hint">Required to confirm it is you.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input className="input" type="password" id="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="hint">At least 8 characters with letters and numbers.</p>
            </div>
            <div>
              <label className="label" htmlFor="password_confirmation">Confirm new password</label>
              <input className="input" type="password" id="password_confirmation" required autoComplete="new-password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
              <p className="hint">Must match the new password above.</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">Minimum 8 characters with letters and numbers.</p>
          {error && <p className="flash-err">{error}</p>}
          {message && <p className="flash-ok">{message}</p>}
          <button type="submit" className="btn btn-primary">Update password</button>
        </form>

        <div className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Security tips</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Use a unique password you do not reuse elsewhere.</li>
              <li>Never share your login — staff will never ask for it.</li>
              <li>Complete identity verification to unlock withdrawals.</li>
              <li>Contact support immediately if you notice unfamiliar ledger activity.</li>
            </ul>
          </div>

          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Session</h2>
            <p className="mt-2 text-sm text-slate-500">Signed in as {user?.email} on this device.</p>
          </div>
        </div>
      </div>
    </>
  )
}
