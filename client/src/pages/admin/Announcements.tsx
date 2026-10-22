import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Announcements() {
  usePageTitle('Announcements')
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', audience: 'all', severity: 'info', body: '', expires_at: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/admin/announcements').then((res) => setItems(res.data?.items ?? [])).catch(() => undefined)
  }, [])

  async function handleSaveDraft(e?: React.FormEvent) {
    e?.preventDefault()
    setMessage('')
    try {
      const res = await api.post('/admin/announcements', {
        title: form.title,
        body: form.body,
        audience: form.audience,
        severity: form.severity,
        expires_at: form.expires_at || null,
      })
      setMessage('Saved as draft.')
      setForm({ title: '', audience: 'all', severity: 'info', body: '', expires_at: '' })
      api.get('/admin/announcements').then((r) => setItems(r.data?.items ?? [])).catch(() => undefined)
      return res.data
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Save failed')
      return null
    }
  }

  async function handlePublish() {
    const created = await handleSaveDraft()
    if (created && created.id) {
      try {
        await api.post(`/admin/announcements/${created.id}/publish`)
        setMessage('Published.')
      } catch (err: any) {
        setMessage(err.response?.data?.message ?? 'Publish failed')
      }
    }
    api.get('/admin/announcements').then((r) => setItems(r.data?.items ?? [])).catch(() => undefined)
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="section-sub">Draft and publish notices shown in the member portal.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ title: '', audience: 'all', severity: 'info', body: '', expires_at: '' }); setMessage('') }}>
          <Plus className="h-4 w-4 mr-1" /> Add new
        </button>
      </div>

      <div className="mt-6 card card-pad">
        <form onSubmit={handleSaveDraft} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-title" className="label">Title</label>
              <input id="a-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="a-audience" className="label">Audience</label>
              <select id="a-audience" className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">All</option>
                <option value="members">Members</option>
                <option value="admins">Admins</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-severity" className="label">Severity</label>
              <select id="a-severity" className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label htmlFor="a-expires" className="label">Expires at (optional)</label>
              <input id="a-expires" type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="a-body" className="label">Body</label>
            <textarea id="a-body" className="input min-h-[120px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          </div>
          {message && <p className="flash-ok">{message}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn btn-ghost">Save as draft</button>
            <button type="button" className="btn btn-primary" onClick={handlePublish}>Publish</button>
          </div>
        </form>
      </div>

      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Audience</th><th>Severity</th><th>Published</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.title}</td><td>{i.audience}</td><td>{i.severity}</td><td>{i.is_published ? 'Yes' : 'No'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
