import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

export default function AdminRewards() {
  usePageTitle('Rewards catalogue')
  const [rewards, setRewards] = useState<any[]>([])
  const [ranks, setRanks] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [openEditId, setOpenEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [imageFiles, setImageFiles] = useState<Record<number, File | null>>({})

  async function load() {
    try {
      const res = await api.get('/admin/rewards')
      setRewards(res.data?.rewards ?? [])
      setClaims(res.data?.claims ?? [])
      setRanks(res.data?.ranks ?? [])
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Failed')
    }
  }

  useEffect(() => { load().catch(() => undefined) }, [])

  function startEdit(r: any) {
    setOpenEditId(r.id)
    setEditForm({
      name: r.title ?? r.name ?? '',
      description: r.description ?? '',
      threshold_amount: r.threshold_amount ?? '',
      budget: r.budget ?? '',
      max_claims: r.max_claims ?? '',
      required_rank_id: r.required_rank_id ?? '',
      is_active: !!r.active,
    })
    setImageFiles({ ...imageFiles, [r.id]: null })
  }

  async function saveEdit(id: number) {
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('name', editForm.name || '')
      fd.append('description', editForm.description || '')
      fd.append('threshold_amount', editForm.threshold_amount || '0')
      fd.append('budget', editForm.budget || '')
      fd.append('max_claims', editForm.max_claims || '')
      fd.append('required_rank_id', editForm.required_rank_id || '')
      fd.append('is_active', editForm.is_active ? '1' : '0')
      if (imageFiles[id]) fd.append('image', imageFiles[id]!)
      await api.put(`/admin/rewards/${id}`, fd)
      setOpenEditId(null)
      setMessage('Reward updated.')
      await load()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Update failed')
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Rewards catalogue</h1>
        <p className="section-sub">Edit travel places, card images, thresholds, budgets and the required rank per reward. Rank-to-reward mapping is deliberately manual.</p>
      </div>

      {message && <p className="flash-ok mt-4">{message}</p>}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rewards.map((r) => (
          <div key={r.id} className="group/tile card relative flex flex-col overflow-hidden transition hover:shadow-md">
            <div className="relative h-40 overflow-hidden">
              {r.image ? (
                <img src={r.imageUrl ?? r.image_path ?? ''} alt="" className="h-full w-full object-cover transition duration-300 group-hover/tile:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <span className="text-slate-400">No image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/45 via-transparent to-transparent" />
              <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur ${r.active ? 'text-emerald-600' : 'text-slate-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${r.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {r.active ? 'active' : 'inactive'}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
              <div>
                <h2 className="font-bold leading-tight text-navy-900">{r.title ?? r.name}</h2>
                {r.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.description}</p>}
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Threshold</dt>
                  <dd className="text-sm font-bold text-navy-900">${(r.threshold_amount ?? 0).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Budget</dt>
                  <dd className="text-sm font-bold text-navy-900">{r.budget !== null && r.budget !== undefined ? '$' + Number(r.budget).toLocaleString() : 'unlimited'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Claims cap</dt>
                  <dd className="text-sm font-bold text-navy-900">{r.max_claims ?? '∞'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Claims</dt>
                  <dd className="text-sm font-bold text-navy-900">{r.claims_count ?? 0}</dd>
                </div>
              </dl>

              <details className="group/edit mt-auto" open={openEditId === r.id} onToggle={() => { if (openEditId !== r.id) startEdit(r); }}>
                <summary className="btn btn-outline btn-sm w-full list-none flex items-center justify-center gap-2 cursor-pointer [&::-webkit-details-marker]:hidden">
                  <span>✏</span> Edit reward <span className="transition-transform group-open/edit:rotate-180">▼</span>
                </summary>
                <form onSubmit={(e) => { e.preventDefault(); saveEdit(r.id) }} className="mt-3 grid w-full gap-3">
                  <div>
                    <label className="label" htmlFor={`name-${r.id}`}>Travel place (name)</label>
                    <input className="input" id={`name-${r.id}`} value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength={120} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`desc-${r.id}`}>Description</label>
                    <textarea className="input" id={`desc-${r.id}`} rows={2} maxLength={500} value={editForm.description ?? ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`image-${r.id}`}>Card image</label>
                    <input className="input" id={`image-${r.id}`} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(e) => setImageFiles({ ...imageFiles, [r.id]: e.target.files?.[0] ?? null })} />
                    <p className="hint">Background shown on member and public reward cards (jpg, png, webp or svg — max 2 MB). Leave empty to keep current image.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor={`rank-${r.id}`}>Required rank</label>
                    <select className="input" id={`rank-${r.id}`} value={editForm.required_rank_id ?? ''} onChange={(e) => setEditForm({ ...editForm, required_rank_id: e.target.value })}>
                      <option value="">— none configured —</option>
                      {ranks.map((rank: any) => <option key={rank.id} value={rank.id}>{rank.name}</option>)}
                    </select>
                    <p className="hint">Members must hold this rank to claim the reward; none allows anyone.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor={`threshold-${r.id}`}>Threshold (USD)</label>
                    <input className="input" id={`threshold-${r.id}`} type="number" step="0.01" min={0} value={editForm.threshold_amount ?? ''} onChange={(e) => setEditForm({ ...editForm, threshold_amount: e.target.value })} />
                    <p className="hint">Qualifying volume a member must reach to unlock this reward.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor={`budget-${r.id}`}>Budget (USD)</label>
                    <input className="input" id={`budget-${r.id}`} type="number" step="0.01" min={0} value={editForm.budget ?? ''} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} />
                    <p className="hint">Maximum total dollars payable for this reward; leave empty for no cap.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor={`max-claims-${r.id}`}>Max claims</label>
                    <input className="input" id={`max-claims-${r.id}`} type="number" min={0} value={editForm.max_claims ?? ''} onChange={(e) => setEditForm({ ...editForm, max_claims: e.target.value })} />
                    <p className="hint">Maximum times this reward can be claimed; leave empty for unlimited.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={!!editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                    Active
                  </label>
                  <p className="hint">Inactive rewards are hidden from members and cannot be claimed.</p>
                  <button type="submit" className="btn btn-primary btn-sm">Save reward</button>
                </form>
              </details>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
