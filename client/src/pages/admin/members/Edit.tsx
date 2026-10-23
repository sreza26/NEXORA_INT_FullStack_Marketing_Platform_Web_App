import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { usePageTitle } from '../../../lib/usePageTitle'

interface MemberForm {
  name: string
  email: string
  phone: string
  status: string
  country: string
  city: string
  address_line: string
  emergency_contact: string
}

interface MemberDetail {
  member: {
    id: number
    name: string
    email: string
    member_code: string
    phone: string | null
    status: string
    profile: {
      country?: string | null
      city?: string | null
      address_line?: string | null
      emergency_contact?: string | null
    } | null
  }
}

const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'terminated']

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function MemberEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<MemberDetail['member'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<MemberForm>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    country: '',
    city: '',
    address_line: '',
    emergency_contact: '',
  })
  usePageTitle(member ? `Edit ${member.name}` : 'Edit member')

  useEffect(() => {
    if (!id) return
    api
      .get(`/admin/members/${id}`)
      .then((res) => {
        const detail = res.data as MemberDetail
        setMember(detail.member)
        setForm({
          name: detail.member.name ?? '',
          email: detail.member.email ?? '',
          phone: detail.member.phone ?? '',
          status: detail.member.status ?? 'active',
          country: detail.member.profile?.country ?? '',
          city: detail.member.profile?.city ?? '',
          address_line: detail.member.profile?.address_line ?? '',
          emergency_contact: detail.member.profile?.emergency_contact ?? '',
        })
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    try {
      await api.put(`/admin/members/${id}`, form)
      navigate(`/admin/members/${id}`)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!member) return <p className="text-sm text-slate-400">Member not found.</p>

  function update(field: keyof MemberForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <>
      <div>
        <Link to={`/admin/members/${member.id}`} className="text-sm text-accent-600 hover:underline">← Back to member profile</Link>
        <h1 className="page-title mt-1">Edit {member.name}</h1>
        <p className="section-sub font-mono">{member.member_code} · {member.email}</p>
      </div>

      <form onSubmit={onSubmit} className="card card-pad mt-6 max-w-3xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input className="input" id="name" type="text" required maxLength={255} value={form.name} onChange={(e) => update('name', e.target.value)} />
            <p className="hint">Shown across the member portal and admin directories.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input className="input" id="email" type="email" required maxLength={255} value={form.email} onChange={(e) => update('email', e.target.value)} />
            <p className="hint">Must be unique. Changing it also changes the member's sign-in email.</p>
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input className="input" id="phone" type="text" maxLength={30} placeholder="e.g. +8801700000000" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            <p className="hint">Include country code. Leave empty to clear.</p>
          </div>
          <div>
            <label className="label" htmlFor="status">Account status</label>
            <select className="input" id="status" value={form.status} onChange={(e) => update('status', e.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
            <p className="hint">Suspended and terminated accounts cannot sign in. Suspending stamps a suspension timestamp and reason on the account.</p>
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input className="input" id="country" type="text" maxLength={80} value={form.country} onChange={(e) => update('country', e.target.value)} />
            <p className="hint">From the member's profile. Leave empty to clear.</p>
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input className="input" id="city" type="text" maxLength={80} value={form.city} onChange={(e) => update('city', e.target.value)} />
            <p className="hint">Leave empty to clear.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line">Address line</label>
            <input className="input" id="address_line" type="text" maxLength={255} value={form.address_line} onChange={(e) => update('address_line', e.target.value)} />
            <p className="hint">Street address as entered by the member during registration.</p>
          </div>
          <div>
            <label className="label" htmlFor="emergency_contact">Emergency contact</label>
            <input className="input" id="emergency_contact" type="text" maxLength={30} value={form.emergency_contact} onChange={(e) => update('emergency_contact', e.target.value)} />
            <p className="hint">Backup phone number stored on the member profile.</p>
          </div>
        </div>

        {message && <p className="flash-err mt-4">{message}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button type="submit" className="btn btn-accent">Save changes</button>
          <Link to={`/admin/members/${member.id}`} className="btn btn-ghost">Cancel</Link>
          <p className="hint mt-0 sm:ml-auto">Every change is recorded in the audit log with your admin account.</p>
        </div>
      </form>
    </>
  )
}
