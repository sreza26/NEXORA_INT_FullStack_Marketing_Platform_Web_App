import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '../../lib/usePageTitle'

export default function MemberEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  usePageTitle('Edit member')
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .get(`/admin/members/${id}`)
      .then((res) => setMember(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  const [form, setForm] = useState({
    name: '',
    email: '',
    status: 'active',
    verification_status: 'verified',
  })

  // Keep the form in sync once the member record has loaded.
  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || '',
        email: member.email || '',
        status: member.status || 'active',
        verification_status: member.verification_status || 'verified',
      })
    }
  }, [member])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await api.put(`/admin/members/${id}`, {
        name: form.name,
        email: form.email,
        status: form.status,
        verification_status: form.verification_status,
      })
      navigate(-1)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="mt-6 card card-pad">
      <h2 className="font-bold text-navy-900">Edit member</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" name="status" onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="verification_status">Verification status</label>
          <select className="input" id="verification_status" name="verification_status" onChange={(e) => setForm({ ...form, verification_status: e.target.value })}>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {message && <p className="flash-ok mt-4">{message}</p>}
        <button type="submit" className="btn btn-primary w-full mt-4">Save changes</button>
      </form>
    </div>
  )
}