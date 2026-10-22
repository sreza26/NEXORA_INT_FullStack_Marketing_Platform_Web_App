import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'

export function Contact() {
  usePageTitle('Contact')

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
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <span className="badge badge-info">Support</span>
      <h1 className="mt-3 page-title">Contact us</h1>
      <p className="section-sub">
        {'Questions about verification, withdrawals or the compensation plan? Send a message —\n'}
        {'our team responds within 2 business days.'}
      </p>

      <form onSubmit={submit} className="mt-8 card card-pad space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input
              className="input"
              type="text"
              id="name"
              name="name"
              maxLength={120}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <p className="hint">The name we will use in our reply.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              className="input"
              type="email"
              id="email"
              name="email"
              maxLength={160}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="hint">We reply to this address, usually within 2 business days.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input
            className="input"
            type="text"
            id="subject"
            name="subject"
            maxLength={160}
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <p className="hint">A short summary of your request.</p>
        </div>

        <div>
          <label className="label" htmlFor="message">Message</label>
          <textarea
            className="input"
            id="message"
            name="message"
            rows={6}
            maxLength={5000}
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <p className="hint">Include your member code if you need help with your account.</p>
        </div>

        {error && <p className="flash-err">{error}</p>}
        {status && <p className="flash-ok">{status}</p>}

        <button type="submit" className="btn btn-primary">Send message</button>
      </form>
    </div>
  )
}

export function Legal({ kind }: { kind: 'terms' | 'privacy' | 'income-disclosure' }) {
  const content = LEGAL[kind]
  usePageTitle(content.title)

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="page-title">{content.heading}</h1>
      <p className="section-sub">Last updated: {content.updated}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        {content.notice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <strong>Important:</strong> {content.notice}
          </div>
        )}

        {content.sections.map((section: LegalSection) => (
          <section key={section.heading ?? section.body}>
            {section.heading && <h2 className="mb-2 text-base font-bold text-navy-900">{section.heading}</h2>}
            {section.link ? (
              <p>
                {section.body}{' '}
                <Link to={section.link.href} className="font-semibold text-accent-600">
                  {section.link.label}
                </Link>
                {section.linkSuffix ?? ''}
              </p>
            ) : (
              <p>{section.body}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

interface LegalSection {
  heading?: string
  body: string
  link?: { href: string; label: string }
  linkSuffix?: string
}

const UPDATED = new Date().toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export const LEGAL: Record<string, {
  title: string
  heading: string
  updated: string
  notice?: string
  sections: LegalSection[]
}> = {
  terms: {
    title: 'Terms of Service',
    heading: 'Terms of Service',
    updated: UPDATED,
    sections: [
      { heading: '1. Acceptance of terms', body: 'By creating an account on the NEXORA platform you agree to these Terms of Service, our Privacy Policy, and the Income Disclosure Statement. If you do not agree, do not use the platform.' },
      { heading: '2. Eligibility and accounts', body: 'You must provide accurate registration information and keep your credentials secure. One account is permitted per person. Accounts may be suspended for fraudulent activity, document falsification, or abuse of the referral system.' },
      { heading: '3. Referral relationships', body: 'Sponsor relationships are recorded at registration and may only be corrected by administrators through an audited correction process. Creating false sponsorship, cycling referrals, or self-dealing is prohibited.' },
      { heading: '4. Commissions and payouts', body: 'Commissions are earned only on verified, commission-eligible transactions. All commissions pass through review before payment. The company may reverse commissions arising from refunded, fraudulent, or erroneous transactions; reversals are permanently recorded in the ledger.' },
      { heading: '5. Withdrawals', body: 'Withdrawal requests are reviewed before payment. Processing times depend on payment method and compliance checks. Requests may be delayed while identity verification is outstanding.' },
      { heading: '6. No guarantee of income', body: 'Participation does not guarantee earnings. Results depend on individual effort and downstream sales activity. Refer to the', link: { href: '/income-disclosure', label: 'Income Disclosure' }, linkSuffix: '.' },
      { heading: '7. Termination', body: 'You may close your account at any time by contacting support. The company may terminate accounts that violate these terms, applicable law, or the integrity of the compensation plan. Outstanding legitimate balances remain payable.' },
      { heading: '8. Changes to terms', body: 'We may update these terms; material changes will be announced through the platform. Continued use after the effective date constitutes acceptance.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    heading: 'Privacy Policy',
    updated: UPDATED,
    sections: [
      { heading: 'Data we collect', body: 'Account data (name, email, phone, country), identity verification documents you submit, transaction and wallet records, and technical logs (IP address, device and session information) needed to operate and secure the platform.' },
      { heading: 'How we use your data', body: 'To create and secure your account, verify your identity, calculate and pay compensation, maintain auditable financial records, prevent fraud, comply with legal obligations, and provide support.' },
      { heading: 'Identity documents', body: 'NID/passport scans and selfies are stored privately and accessible only to authorized compliance staff for verification purposes. They are never exposed through public URLs.' },
      { heading: 'Sharing', body: 'We do not sell personal data. Data is shared only with payment processors and authorities where legally required, or with your consent.' },
      { heading: 'Retention and security', body: 'Financial records are retained as required by law. Access to member data is restricted by role-based permissions, and sensitive actions are written to an immutable audit log.' },
      { heading: 'Your rights', body: 'You may request access to, correction of, or deletion of your personal data by contacting support, subject to legal retention requirements for financial records.' },
      { heading: 'Contact', body: 'Privacy requests: use the', link: { href: '/contact', label: 'contact form' }, linkSuffix: '.' },
    ],
  },
  'income-disclosure': {
    title: 'Income Disclosure',
    heading: 'Income Disclosure Statement',
    updated: UPDATED,
    notice: 'NEXORA does not guarantee any income. Earnings depend entirely on individual effort and actual downstream sales of products or services.',
    sections: [
      { heading: 'No passive income', body: 'Generation bonuses are calculated only on verified, commission-eligible sales volume in your downline. Merely enrolling members, paying deposits, or recruiting others does not create earnings.' },
      { heading: 'Typical results', body: 'A majority of participants earn little or no income. Rank salaries and travel rewards require sustained production thresholds that most participants do not reach. Past performance of any member is not a predictor of your results.' },
      { heading: 'Deposits are not earnings', body: 'Any funds you deposit remain your capital subject to the deposit policy; deposits are never counted as sales or commissionable volume.' },
      { heading: 'Transparency', body: 'Every commission, salary and reward payout is recorded in an immutable ledger with approval history, and members may review their own wallet ledger at any time inside the member portal.' },
      { heading: 'Seek independent advice', body: 'Consider consulting an independent financial or legal advisor before participating in any income opportunity.' },
    ],
  },
}
