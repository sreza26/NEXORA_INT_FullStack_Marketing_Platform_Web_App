import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function Network() {
  usePageTitle('My Team')
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/member/team', { replace: true })
  }, [navigate])

  return <p className="text-sm text-slate-400">Redirecting…</p>
}
