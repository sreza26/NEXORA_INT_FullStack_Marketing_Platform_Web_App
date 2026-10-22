import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Deposits() {
  usePageTitle('Deposits')
  const [items, setItems] = useState<any[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => { api.get('/admin/deposits').then((res) => setItems(res.data)).catch((err) => setMessage(err.response?.data?.message ?? 'Failed')) }, [])
  return (
    <>
      <h1 className="page-title">Deposits</h1>
      <p className="section-sub">Review deposit records</p>
      {message && <p className="flash-ok mt-4">{message}</p>}
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Member</th><th>Amount</th><th>Method</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.reference}</td><td>{i.member_name}</td><td>{i.amount}</td><td>{i.method}</td><td>{i.status}</td><td>{new Date(i.created_at.replace(' ', 'T')).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}