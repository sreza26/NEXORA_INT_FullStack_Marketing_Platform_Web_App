import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Reconciliation() {
  usePageTitle('Reconciliation')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/reconciliation').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Reconciliation</h1>
      <p className="section-sub">Reconcile ledger balances</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Reference</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.id}</td><td>{i.reference || ''}</td><td>{i.type || ''}</td><td>{i.status || ''}</td><td>{new Date(i.created_at.replace(' ', 'T')).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}