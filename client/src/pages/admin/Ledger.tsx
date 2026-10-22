import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Ledger() {
  usePageTitle('Ledger')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/ledger').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Ledger</h1>
      <p className="section-sub">Wallet ledger records</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Member</th><th>Member Code</th><th>Type</th><th>Direction</th><th>Amount</th><th>Balance After</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.reference}</td>
                <td>{i.member_name || i.member_code || i.member_id}</td>
                <td>{i.member_code || ''}</td>
                <td>{i.type}</td>
                <td>{i.direction}</td>
                <td>{i.amount}</td>
                <td>{i.balance_after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}