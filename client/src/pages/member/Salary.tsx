import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Info } from 'lucide-react'

interface Payout {
  id: number
  period?: { period?: string }
  rank?: { name?: string }
  amount: number
  status: string
  paid_at?: string
}

export default function Salary() {
  usePageTitle('Salary')
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [rank, setRank] = useState<any>(null)

  useEffect(() => {
    api.get('/member/salary').then((res) => {
      setPayouts(res.data.payouts || [])
      setRank(res.data.rank)
    }).catch(() => undefined)
  }, [])

  const badgeClass = (s: string) => {
    if (s === 'paid') return 'badge-success'
    if (s === 'approved') return 'badge-info'
    if (s === 'pending') return 'badge-warn'
    if (s === 'reversed' || s === 'rejected') return 'badge-danger'
    return 'badge-muted'
  }

  return (
    <>
      <div>
        <h1 className="page-title">Monthly salary</h1>
        <p className="section-sub">
          {rank ? <>Your rank <strong className="text-navy-900">{rank.name}</strong> carries a monthly salary of <strong className="text-gold-500">${Number(rank.salary || rank.monthly_salary || 0).toLocaleString()}</strong> once independently qualified and approved.</> : <>Reach a qualified rank to unlock a company-paid monthly salary.</>}
        </p>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Rank</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Paid at</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-400">No salary payouts yet. Salaries are generated monthly after rank evaluation.</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-navy-900">{p.period?.period || '—'}</td>
                    <td>{p.rank?.name || '—'}</td>
                    <td className="text-right money">{money(Number(p.amount || 0))}</td>
                    <td><span className={`badge ${badgeClass(p.status)}`}>{p.status}</span></td>
                    <td className="text-sm text-slate-500">{p.paid_at ? new Date(p.paid_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
          <span>Salary requires <strong>independent monthly qualification</strong>: your own direct production and network position must be re-verified every period. Payouts are always subject to finance approval.</span>
        </p>
      </div>
    </>
  )
}
