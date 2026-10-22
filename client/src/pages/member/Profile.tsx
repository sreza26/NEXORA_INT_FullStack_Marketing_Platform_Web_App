import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Profile() {
  usePageTitle('Profile')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', country: '', city: '', address_line: '', emergency_contact: '' })
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const [sRes, pRes] = await Promise.all([api.get('/member/summary'), api.get('/member/profile')])
      setUser(sRes.data.user)
      setProfile(pRes.data)
      setForm({
        name: sRes.data.user?.name || '',
        phone: sRes.data.user?.phone || '',
        country: pRes.data?.country || '',
        city: pRes.data?.city || '',
        address_line: pRes.data?.address_line || pRes.data?.address || '',
        emergency_contact: pRes.data?.emergency_contact || '',
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await api.put('/member/profile', form)
      setMessage('Profile updated.')
      await load()
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="section-sub">Keep your personal details up to date.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="card card-pad space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input className="input" type="text" id="name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <p className="hint">Shown only to administrators — use your full legal name.</p>
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input className="input" type="tel" id="phone" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <p className="hint">Include your country code. Visible only to administrators.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="country">Country</label>
              <input className="input" type="text" id="country" maxLength={80} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <p className="hint">Your country of residence, shown only to administrators.</p>
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input className="input" type="text" id="city" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <p className="hint">Shown only to administrators.</p>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address_line">Address</label>
            <input className="input" type="text" id="address_line" maxLength={255} value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
            <p className="hint">Street address, shown only to administrators.</p>
          </div>

          <div>
            <label className="label" htmlFor="emergency_contact">Emergency contact</label>
            <input className="input" type="text" id="emergency_contact" maxLength={30} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            <p className="hint">A name and phone number we can reach in an emergency. Visible only to administrators.</p>
          </div>

          {message && <p className="flash-ok">{message}</p>}
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>

        <div className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Account</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Member code</dt>
                <dd className="font-mono font-semibold text-navy-900">{user?.member_code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-semibold text-navy-900">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd><span className={`badge ${user?.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{user?.status}</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Verification</dt>
                <dd><span className={`badge ${user?.verification_status === 'verified' ? 'badge-success' : user?.verification_status === 'pending' ? 'badge-warn' : 'badge-muted'}`}>{String(user?.verification_status || '').replace(/_/g, ' ')}</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Joined</dt>
                <dd className="font-semibold text-navy-900">{user?.registered_at ? new Date(user.registered_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  )
}
