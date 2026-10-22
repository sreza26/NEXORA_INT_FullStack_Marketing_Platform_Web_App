import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function AuditLogs() {
  usePageTitle('Audit Logs')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/audit-logs').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Audit Logs</h1>
      <p className="section-sub">System audit records</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Actor</th><th>Action</th><th>Subject</th><th>Payload</th><th>Time</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.actor_name || i.actor_id}</td><td>{i.action}</td><td>{i.subject_type}</td><td>{i.payload ? JSON.stringify(i.payload).slice(0, 60) : ''}</td><td>{new Date(i.created_at.replace(' ', 'T')).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}