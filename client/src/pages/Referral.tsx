import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function Referral() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    localStorage.setItem('nexora_ref', code)
    api
      .get(`/public/referral/${encodeURIComponent(code)}`)
      .then(() => navigate(`/register?ref=${encodeURIComponent(code)}`))
      .catch((err) => {
        setError(err.response?.data?.message ?? 'This referral code is not valid')
        setTimeout(() => navigate('/register'), 2500)
      })
  }, [code, navigate])

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 0', display: 'grid', gap: '1rem' }}>
        <span className="badge">Referral</span>
        <h1 style={{ fontSize: '2.2rem' }}>We could not verify that code</h1>
        <p style={{ color: 'var(--text-muted)' }}>{error}. Taking you to the registration form…</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <p>Applying your referral code…</p>
    </div>
  )
}
