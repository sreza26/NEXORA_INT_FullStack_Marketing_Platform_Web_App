import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Hourglass, Lock } from 'lucide-react'

export default function Verification() {
  usePageTitle('Identity Verification')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', nid_number: '', country: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState<{ nid: File | null; selfie: File | null }>({ nid: null, selfie: null })

  async function load() {
    try {
      const res = await api.get('/member/verification')
      const u = res.data.user || {}
      setUser(u)
      setProfile(u.profile || res.data.profile || {})
      setForm({
        full_name: u.profile?.full_name || profile?.full_name || u.name || '',
        nid_number: u.profile?.nid_number || profile?.nid_number || '',
        country: u.profile?.country || profile?.country || '',
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!files.nid) {
      setError('Please attach your NID or passport document.')
      return
    }
    if (!files.selfie) {
      setError('Please attach a selfie photo.')
      return
    }

    const payload = new FormData()
    payload.append('full_name', form.full_name)
    payload.append('nid_number', form.nid_number)
    payload.append('country', form.country)
    payload.append('nid_document', files.nid)
    payload.append('selfie_document', files.selfie)

    try {
      await api.post('/member/verification', payload)
      setMessage('Documents submitted. A compliance officer will review them shortly.')
      setFiles({ nid: null, selfie: null })
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'We could not upload your documents. Please try again.')
    }
  }

  const status = user?.verification_status || 'unverified'
  const statusClass = status === 'verified' ? 'badge-success' : status === 'pending' ? 'badge-warn' : status === 'rejected' ? 'badge-danger' : 'badge-muted'

  return (
    <>
      <div>
        <h1 className="page-title">Identity verification</h1>
        <p className="section-sub">Verification is required before withdrawals are processed. Documents are visible only to compliance staff.</p>
      </div>

      <div className="mt-4">
        <span className={`badge ${statusClass} capitalize`}>Status: {String(status).replace(/_/g, ' ')}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {status === 'pending' ? (
          <div className="card card-pad">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Hourglass className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-bold text-navy-900">Documents under review</h2>
            <p className="mt-2 text-sm text-slate-600">Your documents were submitted and a compliance officer will review them shortly. You will be notified once your status changes.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card card-pad space-y-4">
            <h2 className="font-bold text-navy-900">Submit documents</h2>

            <div>
              <label className="label" htmlFor="full_name">Full name (as on ID)</label>
              <input className="input" type="text" id="full_name" required maxLength={120} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <p className="hint">Must match your government-issued ID exactly.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="nid_number">NID / Passport number</label>
                <input className="input" type="text" id="nid_number" required maxLength={60} value={form.nid_number} onChange={(e) => setForm({ ...form, nid_number: e.target.value })} />
                <p className="hint">Enter the number exactly as printed on your NID or passport.</p>
              </div>
              <div>
                <label className="label" htmlFor="country">Country</label>
                <input className="input" type="text" id="country" required maxLength={80} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <p className="hint">The country that issued your document.</p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="nid_document">NID / Passport document</label>
              <input
                className="input"
                type="file"
                id="nid_document"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFiles((prev) => ({ ...prev, nid: e.target.files?.[0] ?? null }))}
              />
              <p className="mt-1 text-[11px] text-slate-400">JPG, PNG or PDF up to 4 MB.</p>
            </div>

            <div>
              <label className="label" htmlFor="selfie_document">Selfie photo</label>
              <input
                className="input"
                type="file"
                id="selfie_document"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => setFiles((prev) => ({ ...prev, selfie: e.target.files?.[0] ?? null }))}
              />
              <p className="mt-1 text-[11px] text-slate-400">Clear photo of yourself holding your ID (optional text on ID).</p>
            </div>

            {message && <p className="flash-ok">{message}</p>}
            {error && <p className="flash-err">{error}</p>}
            <button type="submit" className="btn btn-accent w-full">Submit for review</button>
          </form>
        )}

        <div className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Current documents</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Full name</dt>
                <dd className="text-right font-semibold text-navy-900">{profile?.full_name || user?.name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">NID number</dt>
                <dd className="text-right font-mono font-semibold text-navy-900">{profile?.nid_number || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Country</dt>
                <dd className="text-right font-semibold text-navy-900">{profile?.country || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">ID document</dt>
                <dd className="text-right"><span className="text-slate-400">Not uploaded</span></dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Selfie</dt>
                <dd className="text-right"><span className="text-slate-400">Not uploaded</span></dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
            <p className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
              <span>Documents are stored privately and served through an authenticated route — never as public URLs.</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
