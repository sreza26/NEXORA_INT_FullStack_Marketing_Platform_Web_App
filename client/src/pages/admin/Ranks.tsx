import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Ranks() {
  usePageTitle('Ranks')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/ranks').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Ranks</h1>
      <p className="section-sub">Manage rank configuration</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Level</th><th>Salary</th><th>Min Direct Links</th><th>Downline Volume</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.code}</td><td>{i.name}</td><td>{i.level}</td><td>{i.salary}</td><td>{i.min_direct_links}</td><td>{i.downline_volume}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}