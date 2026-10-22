import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function Reconciliation() {
  usePageTitle('Ledger reconciliation')
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const res = await api.get('/admin/reconciliation')
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setMessage('')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load reconciliation')
    }
  }

  async function run() {
    setMessage('')
    try {
      await api.post('/admin/reconciliation/run')
      await load()
      setMessage('Reconciliation completed.')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Run reconciliation failed')
    }
  }

  useEffect(() => { load().catch(() => undefined) }, [])

  return (
    <>
      <h1 className="page-title">Ledger reconciliation</h1>
      <p className="section-sub">Compares each wallet's recorded balance against the sum of its ledger entries.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={run}>
          <RefreshCw className="h-4 w-4" /> Run reconciliation
        </button>
        {message && <p className="flash-ok">{message}</p>}
      </div>
      <div className="mt-6 card card-pad">
        <p className="text-sm text-slate-500">Total records: {total}</p>
        <div className="table-wrap mt-4">
          <Table
            head={['ID', 'Member', 'Expected', 'Ledger Sum', 'Difference', 'Status', 'Created']}
            rows={(items || []).map((i: any) => [
              i.id,
              i.member_name ?? i.member_code ?? '—',
              i.expected_balance ?? '—',
              i.ledger_sum ?? '—',
              i.difference ?? '—',
              i.status ?? '—',
              i.run_at ? new Date(i.run_at.replace(' ', 'T')).toLocaleString() : '—',
            ])}
          />
        </div>
      </div>
    </>
  )
}
