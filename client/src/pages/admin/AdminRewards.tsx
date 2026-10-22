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

  if (!data) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <>
      <form onSubmit={create} className="mt-6 card card-pad space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Create reward</h2>
            <p className="text-sm text-slate-500">Members claim rewards with their wallet balance</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="reward-title">Title</label>
          <input
            className="input"
            id="reward-title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="reward-description">Description</label>
          <input
            className="input"
            id="reward-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="reward-cost">Cost</label>
          <input
            className="input"
            id="reward-cost"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
        </div>

        {message && <p className="flash-ok">{message}</p>}

        <button className="btn btn-primary" type="submit">Create reward</button>
      </form>

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Reward catalogue</h2>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['ID', 'Title', 'Cost', 'Active']}
            rows={data.rewards.map((r: any) => [r.id, r.title, money(r.cost), r.active ? 'yes' : 'no'])}
          />
        </div>
      </div>

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Reward claims</h2>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['ID', 'Member', 'Reward', 'Cost', 'Status']}
            rows={data.claims.map((c: any) => [c.id, c.member_name, c.title, money(c.cost), c.status])}
          />
        </div>
        <div className="mt-4 grid gap-2">
          {data.claims
            .filter((c: any) => c.status === 'pending')
            .map((c: any) => (
              <div key={c.id} className="flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => resolveClaim(c.id, 'approve')}>Approve #{c.id}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => resolveClaim(c.id, 'reject')}>Reject #{c.id}</button>
              </div>
            ))}
        </div>
      </div>
    </>
  )
}
