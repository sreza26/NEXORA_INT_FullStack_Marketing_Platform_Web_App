import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface CommissionRow {
  id: number
  amount: number
  recipient_name: string | null
  source_reference: string | null
}

interface StuckRow {
  id: number
  reference: string
  eligible_amount: number
  member_name: string | null
}

interface ExceptionGroup<T> {
  items: T[]
  total: number
}

interface ExceptionsResponse {
  reversed: ExceptionGroup<CommissionRow>
  negative: ExceptionGroup<CommissionRow>
  stuck: ExceptionGroup<StuckRow>
}

export default function CommissionExceptions() {
  usePageTitle('Commission Exceptions')
  const [data, setData] = useState<ExceptionsResponse | null>(null)

  useEffect(() => {
    api
      .get('/admin/commissions/exceptions')
      .then((res) => setData(res.data as ExceptionsResponse))
      .catch(() => setData(null))
  }, [])

  const reversed = data?.reversed ?? { items: [], total: 0 }
  const negative = data?.negative ?? { items: [], total: 0 }
  const stuck = data?.stuck ?? { items: [], total: 0 }

  return (
    <>
      <div>
        <Link to="/admin/commissions" className="text-sm text-accent-600 hover:underline">← Back to commissions</Link>
        <h1 className="page-title mt-1">Commission exceptions</h1>
        <p className="section-sub">Reversed commissions, negative corrections and verified transactions stuck without commissions for over 24 hours.</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">
              Reversed commissions <span className="badge badge-danger ml-1">{reversed.total}</span>
            </h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th className="text-right">Amount</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {reversed.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">None.</td>
                  </tr>
                ) : (
                  reversed.items.map((commission) => (
                    <tr key={commission.id}>
                      <td className="text-sm font-semibold text-navy-900">{commission.recipient_name ?? '—'}</td>
                      <td className="text-right money">${Math.abs(Number(commission.amount)).toFixed(2)}</td>
                      <td className="font-mono text-xs">{commission.source_reference ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">
              Negative amounts <span className="badge badge-warn ml-1">{negative.total}</span>
            </h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th className="text-right">Amount</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {negative.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">None.</td>
                  </tr>
                ) : (
                  negative.items.map((commission) => (
                    <tr key={commission.id}>
                      <td className="text-sm font-semibold text-navy-900">{commission.recipient_name ?? '—'}</td>
                      <td className="text-right text-red-600">-${Math.abs(Number(commission.amount)).toFixed(2)}</td>
                      <td className="font-mono text-xs">{commission.source_reference ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">
              Stuck verified (24h+) <span className="badge badge-warn ml-1">{stuck.total}</span>
            </h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Member</th>
                  <th className="text-right">Eligible</th>
                </tr>
              </thead>
              <tbody>
                {stuck.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">None.</td>
                  </tr>
                ) : (
                  stuck.items.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-mono text-xs">{transaction.reference}</td>
                      <td className="text-sm font-semibold text-navy-900">{transaction.member_name ?? '—'}</td>
                      <td className="text-right money">${Number(transaction.eligible_amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
