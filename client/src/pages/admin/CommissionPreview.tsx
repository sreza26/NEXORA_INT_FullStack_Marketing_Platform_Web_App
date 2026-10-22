import { useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function CommissionPreview() {
  usePageTitle('Commission Preview')
  const [ref, setRef] = useState('')
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')

  async function run() {
    setMessage('')
    try {
      const res = await api.get(`/admin/commissions/preview?ref=${encodeURIComponent(ref)}`)
      setData(res.data)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Preview failed')
    }
  }

  return (
    <>
      <h1 className="page-title">Commission engine preview</h1>
      <p className="section-sub">Dry-run the generation commission calculation for any recorded transaction. Nothing is written.</p>
      {message && <p className="flash-ok mt-4">{message}</p>}
      <div className="mt-6 card card-pad">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label" htmlFor="preview-ref">Transaction reference</label>
            <input className="input" id="preview-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference number" />
          </div>
          <button className="btn btn-primary" onClick={run}>Run preview</button>
        </div>
        {data && (
          <div className="table-wrap mt-4">
            <Table
              head={['Generation', 'Recipient', 'Active', 'Rate', 'Amount']}
              rows={[
                [data.generation ?? '', data.recipient ?? '', data.active ? 'yes' : 'no', data.rate ?? '', data.amount ?? ''],
              ]}
            />
          </div>
        )}
      </div>
    </>
  )
}
