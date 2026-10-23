import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth, hasPermission } from '../../lib/auth'

interface ReconciliationRecord {
  id: number
  member_id: number | null
  member_name: string | null
  expected_balance: number
  ledger_sum: number
  difference: number
  status: string
  notes: string | null
  run_at: string | null
}

interface ReconciliationResponse {
  items: ReconciliationRecord[]
  total: number
}

function formatRunAt(value: string | null): string {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Reconciliation() {
  usePageTitle('Reconciliation')
  const { user } = useAuth()
  const [items, setItems] = useState<ReconciliationRecord[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    const res = await api.get('/admin/reconciliation')
    const data = res.data as ReconciliationResponse
    setItems(data.items ?? [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function run() {
    const confirmed = window.confirm('Run reconciliation across all wallet accounts now?')
    if (!confirmed) return
    setMessage('')
    try {
      await api.post('/admin/reconciliation/run')
      await load()
      setMessage('Reconciliation completed.')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Run reconciliation failed')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Ledger reconciliation</h1>
          <p className="section-sub">Compares each wallet's recorded balance against the sum of its ledger entries.</p>
        </div>
        {hasPermission(user, 'reconciliation.run') && (
          <button type="button" className="btn btn-accent" onClick={() => run().catch(() => undefined)}>
            <RefreshCw className="h-4 w-4" /> Run reconciliation
          </button>
        )}
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run at</th>
                <th>Member</th>
                <th className="text-right">Expected balance</th>
                <th className="text-right">Ledger sum</th>
                <th className="text-right">Difference</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400">No reconciliation runs yet — run one to establish a baseline.</td>
                </tr>
              ) : (
                items.map((record) => (
                  <tr key={record.id}>
                    <td className="text-sm text-slate-500">{formatRunAt(record.run_at)}</td>
                    <td>
                      {record.member_id ? (
                        <Link className="font-semibold text-navy-900 hover:text-accent-600" to={`/admin/members/${record.member_id}`}>
                          {record.member_name ?? '—'}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-right money">${Number(record.expected_balance).toFixed(2)}</td>
                    <td className="text-right money">${Number(record.ledger_sum).toFixed(2)}</td>
                    <td className={`text-right money font-semibold ${Number(record.difference) !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${Number(record.difference).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${record.status === 'match' ? 'badge-success' : 'badge-danger'}`}>{record.status}</span>
                    </td>
                    <td className="text-xs text-slate-400">{record.notes ?? '—'}</td>
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
