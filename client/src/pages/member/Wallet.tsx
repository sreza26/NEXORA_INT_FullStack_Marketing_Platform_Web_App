import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat, Table } from '../../components/Shell'

export default function Wallet() {
  usePageTitle('Wallet')
  const [account, setAccount] = useState<any>({ balance: 0, pending_balance: 0, lifetime_credited: 0, lifetime_debited: 0, currency: 'USD' })
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    api.get('/member/wallet')
      .then((res) => {
        if (res.data.account) setAccount(res.data.account)
        if (res.data.entries) setEntries(res.data.entries)
      })
      .catch(() => {
        api.get('/member/ledger').then((res) => {
          setAccount({ balance: res.data.balance || 0, pending_balance: res.data.pending_balance || 0, lifetime_credited: res.data.lifetime_credited || 0, lifetime_debited: res.data.lifetime_debited || 0, currency: res.data.currency || 'USD' })
          setEntries(res.data.items || [])
        }).catch(() => undefined)
      })
  }, [])

  function fmtDate(at?: string) {
    if (!at) return '—'
    const d = new Date(String(at).replace(' ', 'T'))
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const rows = entries.length === 0
    ? [['No ledger entries yet.', '', '', '', '', '', '']]
    : entries.map((e: any) => {
        const direction = String(e.direction || '').toLowerCase()
        const amountStr = (direction === 'credit' ? '+' : '-') + money(Number(e.amount || 0))
        const balanceStr = e.balance_after !== null && e.balance_after !== undefined ? money(Number(e.balance_after)) : '—'
        const status = String(e.status || '')
        return [
          String(e.reference || '—'),
          String(e.type ? String(e.type).replace(/_/g, ' ') : '—'),
          direction,
          amountStr,
          balanceStr,
          status,
          fmtDate(e.created_at),
        ]
      })

  return (
    <>
      <div>
        <h1 className="page-title">Wallet &amp; ledger</h1>
        <p className="section-sub">Immutable double-entry record of every credit and debit on your account.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Available balance" value={money(Number(account.balance || 0))} />
        <Stat label="Pending balance" value={money(Number(account.pending_balance || 0))} />
        <Stat label="Lifetime credited" value={money(Number(account.lifetime_credited || 0))} />
        <Stat label="Lifetime debited" value={money(Number(account.lifetime_debited || 0))} />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">Ledger entries</h2>
          <span className="badge badge-muted">Balance: {account.currency || 'USD'}</span>
        </div>
        <div className="table-wrap">
          <Table
            head={['Reference', 'Type', 'Direction', 'Amount', 'Balance after', 'Status', 'Date']}
            rows={rows}
          />
        </div>
      </div>
    </>
  )
}
