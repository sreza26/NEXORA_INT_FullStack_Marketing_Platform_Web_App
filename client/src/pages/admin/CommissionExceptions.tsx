import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function CommissionExceptions() {
  usePageTitle('Commission Exceptions')
  const [items, setItems] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/admin/commissions/exceptions').then((res) => {
      const d = res.data
      const rows: any[] = []
      if (d.reversed) d.reversed.forEach((r: any) => rows.push({ ...r, kind: 'reversed' }))
      if (d.negative) d.negative.forEach((r: any) => rows.push({ ...r, kind: 'negative' }))
      if (d.stuck) d.stuck.forEach((r: any) => rows.push({ ...r, kind: 'stuck' }))
      setItems(rows)
    }).catch((err: any) => setMessage(err.response?.data?.message ?? 'Failed'))
  }, [])

  return (
    <>
      <h1 className="page-title">Commission exceptions</h1>
      <p className="section-sub">Reversed commissions, negative corrections and verified transactions stuck without commissions for over 24 hours.</p>
      {message && <p className="flash-ok mt-4">{message}</p>}
      <div className="mt-6 card card-pad">
        <div className="table-wrap">
          <Table
            head={['Kind', 'Reference', 'Member', 'Eligible', 'Amount']}
            rows={items.map((i) => [i.kind ?? '', i.reference ?? '', i.member ?? '', i.eligible ? 'yes' : 'no', String(i.amount ?? '')])}
          />
        </div>
      </div>
    </>
  )
}
