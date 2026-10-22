import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Transactions() {
  usePageTitle('Transactions')
  const [items, setItems] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/admin/transactions').then((res) => setItems(res.data)).catch((err) => setMessage(err.response?.data?.message ?? 'Failed'))
  }, [])

  return (
    <>
      <h1 className="page-title">Transactions</h1>
      <p className="section-sub">Review business transactions</p>
      {message && <p className="flash-ok mt-4">{message}</p>}
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.reference}</td><td>{i.type}</td><td>{i.amount}</td><td>{i.status}</td><td>{new Date(i.created_at.replace(' ', 'T')).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}