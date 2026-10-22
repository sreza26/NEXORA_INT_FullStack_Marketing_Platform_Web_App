import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat } from '../../components/Shell'

export default function Commissions() {
  usePageTitle('Commissions')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/commissions').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  const pending = items.filter((i) => i.status === 'pending').length
  const approved = items.filter((i) => i.status === 'approved').length
  const paid = items.filter((i) => i.status === 'paid').length
  return (
    <>
      <h1 className="page-title">Commissions</h1>
      <p className="section-sub">Review and process commission records</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total commissions" value={items.length} />
        <Stat label="Pending" value={pending} />
        <Stat label="Paid" value={paid} />
      </div>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Member</th><th>Amount</th><th>Rate</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.member_name}</td><td>{money(i.amount)}</td><td>{i.rate}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}