import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Settings() {
  usePageTitle('Settings')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { api.get('/admin/settings').then((res) => setItems(res.data)).catch(() => undefined) }, [])
  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="section-sub">Application settings</p>
      <div className="mt-6 card card-pad">
        {items.map((i) => (
          <div key={i.key} className="border-b border-slate-100 py-3 last:border-0">
            <h3 className="font-semibold text-navy-900">{i.key}</h3>
            <p className="text-sm text-slate-500">{i.value ?? i.description ?? ''}</p>
          </div>
        ))}
      </div>
    </>
  )
}