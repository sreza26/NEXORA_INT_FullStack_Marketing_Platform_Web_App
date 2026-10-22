import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { Table } from '../../components/Shell'

export default function Reports() {
  const [stats, setStats] = useState<any>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/admin/summary').then((res) => setStats(res.data)).catch(() => setStats(null))
  }, [])

  async function runSalary() {
    setMessage('')
    try {
      const res = await api.post('/admin/salary/run')
      setMessage(`Salary run complete — ${res.data.paid} members, ${money(res.data.total)} paid.`)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Salary run failed')
    }
  }

  async function recordPurchase() {
    setMessage('')
    const memberId = window.prompt('Member id')
    const amount = window.prompt('Amount')
    if (!memberId || !amount) return
    try {
      const res = await api.post('/admin/purchases', { member_id: Number(memberId), amount: Number(amount) })
      setMessage(
        `Recorded. ${res.data.commissions.created} commissions created (${money(res.data.commissions.total)}).`,
      )
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Could not record the purchase')
    }
  }

  if (!stats) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <>
      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Platform reports</h2>
            <p className="text-sm text-slate-500">Export member data or run scheduled jobs</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn btn-primary" href="/api/admin/report?format=xlsx">Download XLSX report</a>
          <a className="btn btn-ghost" href="/api/admin/report?format=csv">Download CSV report</a>
          <button className="btn btn-ghost" onClick={recordPurchase}>Record a purchase</button>
          <button className="btn btn-ghost" onClick={runSalary}>Run monthly salary</button>
        </div>
        {message && <p className="flash-ok mt-4">{message}</p>}
      </div>

      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy-900">Snapshot</h2>
          </div>
        </div>
        <div className="table-wrap mt-4">
          <Table
            head={['Metric', 'Value']}
            rows={[
              ['Total members', stats.total_members],
              ['Active members', stats.active_members],
              ['Verified members', stats.verified_members],
              ['Pending withdrawals', stats.pending_withdrawals],
              ['Approved withdrawal total', money(stats.approved_withdrawal_total)],
              ['Paid commission total', money(stats.paid_commission_total)],
            ]}
          />
        </div>
      </div>
    </>
  )
}
