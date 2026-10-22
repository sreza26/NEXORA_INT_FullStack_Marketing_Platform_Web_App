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
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <span className="badge badge-danger">Referral</span>
        <h1 className="mt-3 page-title">We could not verify that code</h1>
        <p className="section-sub">{error}. Taking you to the registration form…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-slate-600">Applying your referral code…</p>
    </div>
  )
}
