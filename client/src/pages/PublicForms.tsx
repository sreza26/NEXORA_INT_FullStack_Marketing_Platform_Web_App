import { useState } from 'react'
import { api } from '../lib/api'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    try {
      const res = await api.post('/public/contact', form)
      setStatus(res.data.message)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to send your message')
    }
  }

  return (
    <div className="container" style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: '720px' }}>
        <span className="badge">Contact</span>
        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1 }}>Talk to the NEXORA team.</h1>
        <p style={{ color: 'var(--text-muted)' }}>Questions about the marketing plan, compliance or your account? Send a message.</p>
      </div>

      <form className="card" style={{ width: 'min(640px, 92vw)' }} onSubmit={submit}>
        <div className="card-body">
          <label className="label">
            Name
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="label">
            Email
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label">
            Subject
            <input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="label">
            Message
            <textarea className="input" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          {status && <p style={{ color: 'var(--success)' }}>{status}</p>}
          <button className="btn btn-primary" type="submit">Send message</button>
        </div>
      </form>
    </div>
  )
}

const LEGAL = {
  terms: {
    title: 'Terms & conditions',
    body: [
      'By creating a NEXORA account you agree to these terms, the marketing plan and the policies published in the member portal.',
      'Commissions are calculated from verified business transactions only. The platform reserves the right to reverse any commission that is later cancelled, refunded or found to be in violation of these terms.',
      'Withdrawal requests are held during the review period configured by the platform. Approved withdrawals are paid to the account details on file.',
      'Accounts found to be abusing the referral system, self-dealing or violating local laws may be suspended without notice.',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      'We store the information you provide during registration: name, email, phone number, password hash and referral relationships.',
      'Financial records such as wallet balances, ledger entries and withdrawal requests are retained to satisfy accounting and compliance obligations.',
      'We never sell personal data. Access is limited to authorised platform staff and recorded in the audit log.',
      'You can request a copy of your data or ask for your account to be deleted by contacting support.',
    ],
  },
  'income-disclosure': {
    title: 'Income disclosure',
    body: [
      'Income in a network marketing programme depends entirely on your own effort, your ability to build and maintain a customer base, and the level of effort of the members you sponsor.',
      'NEXORA does not guarantee any specific level of income. Typical results vary and are not indicative of what you will achieve.',
      'No income claim made by a member is a promise by the platform. We publish verifiable statistics of actual payouts so you can assess the opportunity with real data.',
    ],
  },
}

export function Legal({ kind }: { kind: keyof typeof LEGAL }) {
  const content = LEGAL[kind]
  return (
    <div className="container" style={{ padding: '3rem 0', display: 'grid', gap: '1.4rem', maxWidth: '840px' }}>
      <span className="badge">Legal</span>
      <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1.05 }}>{content.title}</h1>
      {content.body.map((paragraph, index) => (
        <p key={index} style={{ color: 'var(--text-muted)' }}>{paragraph}</p>
      ))}
    </div>
  )
}
