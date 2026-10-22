import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat } from '../../components/Shell'

export default function RewardClaims() {
  usePageTitle('Reward Claims')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/reward-claims').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  const pending = items.filter((i) => i.status === 'pending').length
  const approved = items.filter((i) => i.status === 'approved').length
  return (
    <>
      <h1 className="page-title">Reward Claims</h1>
      <p className="section-sub">Review and resolve reward claims</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total claims" value={items.length} />
        <Stat label="Pending" value={pending} />
        <Stat label="Resolved" value={approved} />
      </div>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead><tr><th>Claim</th><th>Reward</th><th>Member</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}><td>{i.id}</td><td>{i.reward_name || ''}</td><td>{i.member_name}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}