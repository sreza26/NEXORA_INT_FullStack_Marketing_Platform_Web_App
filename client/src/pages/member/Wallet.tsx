import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface LedgerEntry {
  id: number
  reference?: string
  type: string
  direction: string
  amount: number
  balance_after?: number
  status: string
  created_at: string
}

interface Account {
  balance: number
  pending_balance?: number
  lifetime_credited?: number
  lifetime_debited?: number
  currency?: string
}

export default function Wallet() {
  usePageTitle('Wallet')
  const [account, setAccount] = useState<Account>({ balance: 0, pending_balance: 0, lifetime_credited: 0, lifetime_debited: 0, currency: 'USD' })
  const [entries, setEntries] = useState<LedgerEntry[]>([])

  useEffect(() => {
    api.get('/member/wallet').then((res) => {
      if (res.data.account) setAccount(res.data.account)
      if (res.data.entries) setEntries(res.data.entries)
    }).catch(() => {
      api.get('/member/ledger').then((res) => {
        setAccount({ balance: res.data.balance || 0, currency: 'USD' })
        setEntries(res.data.items || [])
      }).catch(() => undefined)
    })
  }, [])

  const badgeClass = (s: string) => {
    if (s === 'completed' || s === 'approved') return 'badge-success'
    if (s === 'pending') return 'badge-warn'
    if (s === 'reversed') return 'badge-danger'
    return 'badge-muted'
  }

  return (
    <>
      <div>
        <h1 className="page-title">Wallet &amp; ledger</h1>
        <p className="section-sub">Immutable double-entry record of every credit and debit on your account.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Available balance</span>
          <span className="stat-value">{money(Number(account.balance || 0))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending balance</span>
          <span className="stat-value">{money(Number(account.pending_balance || 0))}</span>
          <span className="text-xs text-slate-400">Not yet available for withdrawal</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime credited</span>
          <span className="stat-value text-emerald-600">{money(Number(account.lifetime_credited || 0))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lifetime debited</span>
          <span className="stat-value text-rose-600">{money(Number(account.lifetime_debited || 0))}</span>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Ledger entries</h2>
          <span className="badge badge-muted">Balance: {account.currency || 'USD'}</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Direction</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance after</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400">No ledger entries yet.</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-xs">{e.reference || '—'}</td>
                    <td className="capitalize">{String(e.type).replace(/_/g, ' ')}</td>
                    <td><span className={`badge ${e.direction === 'credit' ? 'badge-success' : 'badge-danger'}`}>{e.direction}</span></td>
                    <td className={`text-right font-semibold tabular-nums ${e.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.direction === 'credit' ? '+' : '-'}{money(Number(e.amount || 0))}
                    </td>
                    <td className="text-right tabular-nums text-slate-600">{e.balance_after !== null && e.balance_after !== undefined ? money(Number(e.balance_after)) : '—'}</td>
                    <td><span className={`badge ${badgeClass(e.status)}`}>{e.status}</span></td>
                    <td className="whitespace-nowrap text-sm text-slate-500">{e.created_at ? new Date(e.created_at.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td>
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
