import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat } from '../../components/Shell'

export default function Salary() {
  usePageTitle('Salary')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/salary').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  const pending = items.filter((i) => i.status === 'pending').length
  const paid = items.filter((i) => i.status === 'paid').length
  return (
    <>
      <h1 className="page-title">Salary</h1>
      <p className="section-sub">Salary payouts</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total payouts" value={items.length} />
        <Stat label="Pending" value={pending} />
        <Stat label="Paid" value={paid} />
      </div>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Member</th><th>Payout Amount</th><th>Period</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.member_name}</td><td>{money(i.amount)}</td><td>{i.period || i.salary_period || ''}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}