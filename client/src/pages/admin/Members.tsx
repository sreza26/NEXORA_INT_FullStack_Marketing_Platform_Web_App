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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
          <label className="label">
            Search members
            <input className="input" value={search} placeholder="Name, email or member code"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(search) }} />
          </label>
          <button className="btn btn-primary" onClick={() => load(search)}>Search</button>
        </div>
      </div>

      {message && <p style={{ color: 'var(--warning)', marginBottom: '1rem' }}>{message}</p>}

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Members</h3>
            <p style={{ color: 'var(--text-muted)' }}>Manage account status and verification</p>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
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
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>
            {items.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => setStatus(m.id, m.status === 'suspended' ? 'active' : 'suspended')}>
                  {m.status === 'suspended' ? 'Activate' : 'Suspend'}
                </button>
                <button className="btn btn-ghost" onClick={() => setVerification(m.id, m.verification_status === 'verified' ? 'pending' : 'verified')}>
                  {m.verification_status === 'verified' ? 'Unverify' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
