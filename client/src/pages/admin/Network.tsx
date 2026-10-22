import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Stat, Table } from '../../components/Shell'

export default function Network() {
  usePageTitle('Network Explorer')
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function load(term = '') {
    try {
      const res = await api.get(`/admin/network?search=${encodeURIComponent(term)}`)
      setItems(res.data.items)
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load network')
    }
  }

  return (
    <>
      <div className="mt-6 card card-pad">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="member-search">Search members</label>
            <input
              className="input"
              id="member-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(search) }}
              placeholder="Name, email or member code"
            />
          </div>
          <button className="btn btn-primary" onClick={() => load(search)}>Search</button>
        </div>

        {message && <p className="flash-ok mt-4">{message}</p>}

        <div className="mt-6 card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy-900">Network Explorer</h2>
              <p className="text-sm text-slate-500">Manage your network relationships</p>
            </div>
          </div>

          <div className="table-wrap mt-4">
            <Table
              head={['Name', 'Email', 'Code', 'Status', 'Sponsor', 'Actions']}
              rows={items.map((m) => [
                m.name,
                m.email,
                m.member_code,
                m.status,
                m.sponsor_name || ' — ',
                `${m.status === 'suspended' ? 'Activate' : 'Suspend'}`
              ])}
            />
          </div>
        </div>
      </div>
    </>
  )
}