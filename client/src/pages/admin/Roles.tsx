import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface RoleRow {
  id: number
  name: string
  label: string | null
  description: string | null
  permissions_count: number
}

interface RoleUser {
  id: number
  name: string
  email: string
  roles: string[]
}

interface RolesResponse {
  roles: RoleRow[]
  users: RoleUser[]
}

export default function Roles() {
  usePageTitle('Roles')
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [users, setUsers] = useState<RoleUser[]>([])
  const [q, setQ] = useState('')

  async function load(search = q) {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    const res = await api.get(`/admin/roles?${params.toString()}`)
    const data = res.data as RolesResponse
    setRoles(data.roles ?? [])
    setUsers(data.users ?? [])
  }

  useEffect(() => {
    load('').catch(() => undefined)
  }, [])

  async function assign(userId: number, role: string) {
    await api.post(`/admin/roles/${userId}/assign`, { role })
    await load()
  }

  return (
    <>
      <div>
        <h1 className="page-title">Role assignment</h1>
        <p className="section-sub">Each member holds at most one staff role. Choosing &quot;member&quot; removes all staff roles.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load().catch(() => undefined)
        }}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input className="input" type="search" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
        <Link to="/admin/roles" className="btn btn-ghost" onClick={() => setQ('')}>Reset</Link>
      </form>
      <p className="hint">Leave empty to show all rows.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="font-bold text-navy-900">{role.name}</p>
            <p className="text-[11px] text-slate-400">{role.permissions_count} permission(s)</p>
          </div>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Current role</th>
                <th className="text-right">Assign role</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-slate-400">No users match your search.</td></tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold text-navy-900">{row.name}</td>
                    <td className="text-sm text-slate-500">{row.email}</td>
                    <td>
                      {row.roles.length === 0 ? (
                        <span className="badge badge-muted">member</span>
                      ) : (
                        row.roles.map((role) => (
                          <span key={role} className="badge badge-info">{role}</span>
                        ))
                      )}
                    </td>
                    <td className="text-right">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const form = e.currentTarget
                          const select = form.elements.namedItem('role') as HTMLSelectElement
                          assign(row.id, select.value).catch(() => undefined)
                        }}
                        className="flex items-center justify-end gap-2"
                      >
                        <select className="input !py-1.5 !text-xs" name="role" defaultValue={row.roles[0] ?? 'member'}>
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>{role.name}</option>
                          ))}
                          <option value="member">member</option>
                        </select>
                        <button type="submit" className="btn btn-primary btn-sm">Assign</button>
                      </form>
                      <p className="hint">Staff role controls which admin pages this user can access.</p>
                    </td>
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
