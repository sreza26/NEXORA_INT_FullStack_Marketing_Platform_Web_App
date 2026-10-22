import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface Transaction {
  id: number
  reference: string
  type: string
  description?: string
  gross_amount: number
  eligible_amount?: number
  status: string
  created_at: string
}

export default function Transactions() {
  usePageTitle('Transactions')
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const url = status ? `/member/transactions?status=${status}` : '/member/transactions'
    api.get(url).then((res) => setTransactions(res.data.transactions || [])).catch(() => setTransactions([]))
  }, [status])

  const filters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'reversed', label: 'Reversed' },
  ]

  const badgeClass = (s: string) => {
    if (s === 'verified') return 'badge-success'
    if (s === 'pending') return 'badge-warn'
    if (s === 'rejected' || s === 'reversed') return s === 'rejected' ? 'badge-danger' : 'badge-muted'
    return 'badge-muted'
  }

  return (
    <>
      <div>
        <h1 className="page-title">My transactions</h1>
        <p className="section-sub">Every business transaction you have recorded, and its verification status.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link key={f.value} to={f.value ? `/member/transactions?status=${f.value}` : '/member/transactions'} className={`filter-chip ${status === f.value ? 'filter-chip-active' : ''}`}>{f.label}</Link>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Gross</th>
                <th className="text-right">Eligible</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400">No transactions found.</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.reference}</td>
                    <td className="capitalize">{t.type}</td>
                    <td className="max-w-[240px] truncate text-sm">{t.description || '—'}</td>
                    <td className="text-right money">{money(Number((t as any).gross_amount || (t as any).amount || 0))}</td>
                    <td className="text-right money">{money(Number(t.eligible_amount || 0))}</td>
                    <td><span className={`badge ${badgeClass(t.status)}`}>{t.status}</span></td>
                    <td className="whitespace-nowrap text-sm text-slate-500">{t.created_at ? new Date(t.created_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
