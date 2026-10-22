import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Jobs() {
  usePageTitle('Scheduled Jobs')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/jobs').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Scheduled Jobs</h1>
      <p className="section-sub">Monitor scheduled job runs</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Job</th><th>Started</th><th>Finished</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.command || i.name}</td><td>{i.started_at ? new Date(i.started_at.replace(' ', 'T')).toLocaleString() : ''}</td><td>{i.finished_at ? new Date(i.finished_at.replace(' ', 'T')).toLocaleString() : ''}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}