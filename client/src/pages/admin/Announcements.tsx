import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Announcements() {
  usePageTitle('Announcements')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/announcements').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Announcements</h1>
      <p className="section-sub">Manage announcements</p>
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