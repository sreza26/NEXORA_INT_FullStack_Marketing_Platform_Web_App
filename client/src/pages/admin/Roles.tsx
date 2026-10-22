import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Roles() {
  usePageTitle('Roles')
  const [roles, setRoles] = useState<any[]>([])

  useEffect(() => {
    api.get('/admin/roles').then((res) => setRoles(res.data)).catch(() => undefined)
  }, [])

  return (
    <>
      <h1 className="page-title">Roles</h1>
      <p className="section-sub">Manage staff roles and permissions</p>
      <div className="mt-6 card card-pad">
        <table className="data-table">
          <thead>
            <tr><th>Role</th><th>Label</th><th>Description</th></tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.label}</td>
                <td>{r.description || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}