import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Info, MessageCircle, Send, Mail } from 'lucide-react'

export default function Referrals() {
  usePageTitle('My Referral Link')
  const [referralUrl, setReferralUrl] = useState('')
  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/member/referrals'), api.get('/member/summary')]).then(([r, s]) => {
      setUser(s.data.user)
      const code = s.data.user?.member_code
      if (code) setReferralUrl(`${window.location.origin}/r/${code}`)
      else setReferralUrl(r.data.referral_link || '')
    }).catch(() => undefined)
  }, [])

  function copy() {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <>
      <div>
        <h1 className="page-title">My referral link</h1>
        <p className="section-sub">Share this link so new members join under your sponsorship. Sponsor relationships are recorded permanently at registration.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <label className="label" htmlFor="referral-url">Your personal referral URL</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="input flex-1 font-mono text-xs" type="text" id="referral-url" value={referralUrl} readOnly />
            <button type="button" className="btn btn-accent" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
          <p className="hint">New members who open this link join under your sponsorship automatically.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Your member code</p>
              <p className="mt-1 font-mono text-lg font-bold text-navy-900">{user?.member_code}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Referral landing path</p>
              <p className="mt-1 font-mono text-lg font-bold text-navy-900">/r/{user?.member_code}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-accent-500/30 bg-accent-500/5 p-4 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
              <span>Visitors arriving through your link land on the registration page with your sponsor code pre-filled. You can also share the raw code <strong className="font-mono">{user?.member_code}</strong> for manual entry.</span>
            </p>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="font-bold text-navy-900">Your sponsor</h2>
          {user?.sponsor ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-accent-400">
                {String(user.sponsor.name).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">{user.sponsor.name}</p>
                <p className="font-mono text-xs text-slate-400">{user.sponsor.member_code}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">You registered without a sponsor (direct member).</p>
          )}

          <h3 className="mt-6 font-bold text-navy-900">Quick share</h3>
          <div className="mt-3 space-y-2 text-sm">
            <a className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-accent-500" href={`https://wa.me/?text=${encodeURIComponent('Join me on NEXORA ' + referralUrl)}`} target="_blank" rel="noopener">
              <MessageCircle className="h-4 w-4 text-emerald-500" /> Share on WhatsApp
            </a>
            <a className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-accent-500" href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}`} target="_blank" rel="noopener">
              <Send className="h-4 w-4 text-sky-500" /> Share on Telegram
            </a>
            <a className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-accent-500" href={`mailto:?subject=${encodeURIComponent('Join NEXORA')}&body=${encodeURIComponent(referralUrl)}`}>
              <Mail className="h-4 w-4 text-slate-500" /> Share by email
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
