import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Table } from '../../components/Shell'

export default function Roles() {
  usePageTitle('Roles')
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [selectedRole, setSelectedRole] = useState<Record<number, string>>({})

  async function load() {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const res = await api.get(`/admin/roles?${params.toString()}`)
      setRoles(res.data?.roles ?? [])
      setUsers(res.data?.users ?? [])
      setMessage('')
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed to load roles')
    }
  }

  useEffect(() => { load().catch(() => undefined) }, [])

  async function assign(userId: number) {
    const role = selectedRole[userId]
    if (!role) return
    setMessage('')
    try {
      await api.post(`/admin/roles/${userId}/assign`, { role })
      setMessage('Role assigned.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Assign failed')
    }
  }

  return (
    <>
      <h1 className="page-title">Role assignment</h1>
      <p className="section-sub">Each member holds at most one staff role. Choosing "member" removes all staff roles.</p>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); load() }}
      >
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="search">Search</label>
          <input
            id="search"
            className="input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
          />
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
        <a href="/admin/roles" className="btn btn-ghost">Reset</a>
      </form>
      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {roles.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="font-bold text-navy-900">{r.name}</p>
            <p className="text-[11px] text-slate-400">{r.permissions_count ?? 0} permission(s)</p>
          </div>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden">
        <p className="hint">Leave empty to show all rows.</p>
        <div className="table-wrap">
          <Table
            head={['User', 'Email', 'Current role', 'Assign role']}
            align={['left', 'left', 'left', 'right']}
            rows={users.map((u) => [
              <span key={u.id} className="font-semibold text-navy-900">{u.name || '—'}</span>,
              <span key={`e-${u.id}`} className="text-sm text-slate-500">{u.email || '—'}</span>,
              <span key="cur" className="inline-flex flex-wrap gap-1">
                {(u.roles || []).length === 0 ? (
                  <span className="badge badge-muted">member</span>
                ) : (
                  (u.roles || []).map((name: string) => (
                    <span key={name} className="badge badge-info">{name}</span>
                  ))
                )}
              </span>,
              <div key="assign" className="flex items-center gap-2 min-w-[160px]">
                <select
                  className="input !py-1.5 !text-xs"
                  value={selectedRole[u.id] ?? (u.roles || [])[0] ?? 'member'}
                  onChange={(e) => setSelectedRole({ ...selectedRole, [u.id]: e.target.value })}
                  aria-label="Assign role"
                >
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => assign(u.id)}>Assign</button>
              </div>,
            ])}
          />
        </div>
      </div>

    </>
  )
}
