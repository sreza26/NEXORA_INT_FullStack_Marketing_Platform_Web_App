import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useLocation, useParams } from 'react-router-dom'
import { usePageTitle } from '../../lib/usePageTitle'

export default function MemberShow() {
  const { id } = useParams<{ id: string }>()
  usePageTitle('Member details')
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api
      .get(`/admin/members/${id}`)
      .then((res) => setMember(res.data))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="mt-6 card card-pad">
      <h2 className="font-bold text-navy-900">{member?.name || 'Member #'}</h2>
      <p className="text-sm text-slate-500">{member?.email || ''}</p>
      <p>Member code: {member?.member_code || ''}</p>
      <p>Status: {member?.status}</p>
      <p>Verification status: {member?.verification_status}</p>
      {member?.roles?.length && <p>Roles: {member.roles.map((r: string) => r).join(', ')}</p>}
    </div>
  )
}