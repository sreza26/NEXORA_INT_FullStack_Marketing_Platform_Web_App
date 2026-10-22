import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Table } from '../../components/Shell'

export default function Members() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  async function load(term = '') {
    const res = await api.get(`/admin/members?search=${encodeURIComponent(term)}`)
    setItems(res.data.items)
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function setStatus(id: number, status: string) {
    setMessage('')
    try {
      await api.patch(`/admin/members/${id}`, { status })
      setMessage(`Member ${id} is now ${status}.`)
      await load(search)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  async function setVerification(id: number, verification_status: string) {
    try {
      await api.patch(`/admin/members/${id}`, { verification_status })
      await load(search)
    } catch {
      setMessage('Update failed')
    }
  }

  return (
    <>
      <div className="mt-6 card card-pad">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="member-search">Search members</label>
            <input
              className="input"
              id="member-search"
              value={search}
              placeholder="Name, email or member code"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(search) }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => load(search)}>Search</button>
        </div>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Members</h2>
            <p className="text-sm text-slate-500">Manage account status and verification</p>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['Name', 'Email', 'Code', 'Status', 'Verification', 'Actions']}
            rows={items.map((m) => [
              m.name,
              m.email,
              m.member_code,
              m.status,
              m.verification_status,
              `${m.status === 'suspended' ? 'Activate' : 'Suspend'} · ${
                m.verification_status === 'verified' ? 'Unverify' : 'Verify'
              }`,
            ])}
          />
        </div>
        <div className="mt-4 grid gap-2">
          {items.map((m) => (
            <div key={m.id} className="flex flex-wrap gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setStatus(m.id, m.status === 'suspended' ? 'active' : 'suspended')}>
                {m.status === 'suspended' ? 'Activate' : 'Suspend'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setVerification(m.id, m.verification_status === 'verified' ? 'pending' : 'verified')}>
                {m.verification_status === 'verified' ? 'Unverify' : 'Verify'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
