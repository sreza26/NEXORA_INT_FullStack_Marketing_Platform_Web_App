import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Table } from '../../components/Shell'

export default function AdminRewards() {
  const [data, setData] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', cost: '0' })
  const [message, setMessage] = useState('')

  async function load() {
    const res = await api.get('/admin/rewards')
    setData(res.data)
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await api.post('/admin/rewards', {
        title: form.title,
        description: form.description,
        cost: Number(form.cost),
      })
      setForm({ title: '', description: '', cost: '0' })
      setMessage('Reward created.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Unable to create the reward')
    }
  }

  async function resolveClaim(id: number, action: 'approve' | 'reject') {
    try {
      await api.post(`/admin/reward-claims/${id}`, { action })
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Action failed')
    }
  }

  if (!data) return <p>Loading…</p>

  return (
    <>
      <form className="card" style={{ marginBottom: '2rem' }} onSubmit={create}>
        <header className="card-header">
          <div>
            <h3>Create reward</h3>
            <p style={{ color: 'var(--text-muted)' }}>Members claim rewards with their wallet balance</p>
          </div>
        </header>
        <div className="card-body">
          <label className="label">
            Title
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="label">
            Description
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="label">
            Cost
            <input className="input" type="number" min="0" step="0.01" value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </label>
          {message && <p style={{ color: 'var(--warning)' }}>{message}</p>}
          <button className="btn btn-primary" type="submit">Create reward</button>
        </div>
      </form>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <header className="card-header">
          <div>
            <h3>Reward catalogue</h3>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['ID', 'Title', 'Cost', 'Active']}
            rows={data.rewards.map((r: any) => [r.id, r.title, money(r.cost), r.active ? 'yes' : 'no'])}
          />
        </div>
      </div>

      <div className="card">
        <header className="card-header">
          <div>
            <h3>Reward claims</h3>
          </div>
        </header>
        <div className="card-body" style={{ padding: '0.5rem 0 0' }}>
          <Table
            head={['ID', 'Member', 'Reward', 'Cost', 'Status']}
            rows={data.claims.map((c: any) => [c.id, c.member_name, c.title, money(c.cost), c.status])}
          />
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>
            {data.claims
              .filter((c: any) => c.status === 'pending')
              .map((c: any) => (
                <div key={c.id} style={{ display: 'flex', gap: '0.6rem' }}>
                  <button className="btn btn-primary" onClick={() => resolveClaim(c.id, 'approve')}>Approve #{c.id}</button>
                  <button className="btn btn-ghost" onClick={() => resolveClaim(c.id, 'reject')}>Reject #{c.id}</button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
