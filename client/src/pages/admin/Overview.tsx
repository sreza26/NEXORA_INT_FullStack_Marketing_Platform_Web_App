import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Stat, Table } from '../../components/Shell'

export default function Overview() {
  const [stats, setStats] = useState<any>(null)
  const [pending, setPending] = useState<any[]>([])

  useEffect(() => {
    Promise.all([api.get('/admin/summary'), api.get('/admin/withdrawals?status=pending')])
      .then(([s, p]) => {
        setStats(s.data)
        setPending(p.data)
      })
      .catch(() => setStats(null))
  }, [])

  if (!stats) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total members" value={stats.total_members} />
        <Stat label="Active members" value={stats.active_members} />
        <Stat label="Verified members" value={stats.verified_members} />
        <Stat label="Pending withdrawals" value={stats.pending_withdrawals} />
        <Stat label="Approved withdrawals" value={money(stats.approved_withdrawal_total)} />
        <Stat label="Paid commissions" value={money(stats.paid_commission_total)} />
      </div>

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Pending withdrawal requests</h2>
            <p className="text-sm text-slate-500">Awaiting finance review</p>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['Member', 'Amount', 'Method', 'Requested']}
            rows={pending.map((w) => [
              w.member_name,
              money(w.amount),
              w.method,
              new Date(w.requested_at.replace(' ', 'T')).toLocaleDateString(),
            ])}
          />
        </div>
      </div>
    </>
  )
}
