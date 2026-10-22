import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat, Table } from '../../components/Shell'

export default function RankReports() {
  usePageTitle('Rank Reports')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/rank-reports').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Rank Reports</h1>
      <p className="section-sub">Rank performance reports</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Members ranked" value={items.length} />
        <Stat label="Reports" value={items.length > 0 ? 1 : 0} />
      </div>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Member</th><th>Rank</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.member_name}</td><td>{i.rank}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}