import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { FileText, FileSpreadsheet, FileDown } from 'lucide-react'

export default function Reports() {
  usePageTitle('Platform reports')
  const [metrics, setMetrics] = useState<any>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { api.get('/admin/reports').then((r) => setMetrics(r.data?.metrics ?? r.data)).catch(() => setMetrics(null)) }, [])

  const groups = [
    { title: 'Members', keys: ['total_registered_members', 'active_members', 'inactive_members', 'direct_referrals_total'] },
    { title: 'Volume', keys: ['gross_business_volume', 'eligible_commissionable_volume', 'platform_wallet_balance'] },
    { title: 'Commissions', keys: ['commission_liability_pending', 'commission_approved_unpaid', 'commission_paid'] },
    { title: 'Salary', keys: ['salary_pending', 'salary_paid'] },
    { title: 'Withdrawals', keys: ['withdrawals_pending', 'withdrawals_approved', 'withdrawals_paid'] },
  ]
  const labels: Record<string, string> = {
    total_registered_members: 'Total registered members',
    active_members: 'Active members',
    inactive_members: 'Inactive members',
    direct_referrals_total: 'Direct referrals (edges)',
    gross_business_volume: 'Gross business volume',
    eligible_commissionable_volume: 'Eligible commissionable volume',
    platform_wallet_balance: 'Platform wallet balance',
    commission_liability_pending: 'Commission liability (pending)',
    commission_approved_unpaid: 'Commission approved unpaid',
    commission_paid: 'Commission paid',
    salary_pending: 'Salary pending',
    salary_paid: 'Salary paid',
    withdrawals_pending: 'Withdrawals pending (count)',
    withdrawals_approved: 'Withdrawals approved (count)',
    withdrawals_paid: 'Withdrawals paid (amount)',
  }
  const isMoney = (key: string) => /volume|commission|salary|balance/.test(key) || key === 'withdrawals_paid'

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Platform reports</h1>
          <p className="section-sub">Key business metrics for the selected period.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-outline btn-sm" href="/api/admin/reports/csv?from=" target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4" /> CSV
          </a>
          <a className="btn btn-outline btn-sm" href="/api/admin/reports/xlsx?from=" target="_blank" rel="noopener noreferrer">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
          <a className="btn btn-accent btn-sm" href="/api/admin/reports/pdf?from=" target="_blank" rel="noopener noreferrer">
            <FileDown className="h-4 w-4" /> PDF
          </a>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const params = new URLSearchParams(); if (from) params.set('from', from); if (to) params.set('to', to); api.get(`/admin/reports?${params.toString()}`).then((r) => setMetrics(r.data?.metrics ?? r.data)).catch(() => setMetrics(null)) }} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input className="input" type="date" id="from" value={from} onChange={(e) => setFrom(e.target.value)} />
          <p className="hint">Start of the date range, local server time.</p>
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input className="input" type="date" id="to" value={to} onChange={(e) => setTo(e.target.value)} />
          <p className="hint">End of the date range, including the whole day.</p>
        </div>
        <button type="submit" className="btn btn-primary">Apply range</button>
      </form>

      {metrics ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title} className="card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-navy-900">{g.title}</h2>
              </div>
              <table className="data-table">
                <tbody>
                  {g.keys.map((k) => (
                    <tr key={k}>
                      <td className="text-sm text-slate-500">{labels[k] ?? k}</td>
                      <td className={`text-right font-semibold tabular-nums ${isMoney(k) ? 'money' : ''}`}>
                        {isMoney(k) ? '$' + Number(metrics[k] ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(metrics[k] ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-navy-900">Rank distribution</h2>
            </div>
            <table className="data-table">
              <tbody>
                {metrics.rank_distribution && Object.entries(metrics.rank_distribution as Record<string, number>).map(([name, count]) => (
                  <tr key={name}><td className="text-sm text-slate-500">{name}</td><td className="text-right font-semibold tabular-nums">{Number(count).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 mt-6">Loading metrics…</p>
      )}
    </>
  )
}