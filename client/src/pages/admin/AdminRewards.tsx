import { useEffect, useState } from 'react'
import { Pencil, ChevronDown, MapPin } from 'lucide-react'
import { api } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'

interface RewardRow {
  id: number
  title: string | null
  name: string
  description: string | null
  threshold_amount: number
  budget: number | null
  max_claims: number | null
  required_rank_id: number | null
  claims_count: number
  is_active: boolean
  image: string | null
  image_url: string | null
}

interface RankOption {
  id: number
  name: string
}

interface RewardsResponse {
  rewards: RewardRow[]
  ranks: RankOption[]
}

interface RewardForm {
  name: string
  description: string
  threshold_amount: string
  budget: string
  max_claims: string
  required_rank_id: string
  is_active: boolean
}

function formatWhole(value: number): string {
  return Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function AdminRewards() {
  usePageTitle('Rewards')
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [ranks, setRanks] = useState<RankOption[]>([])
  const [message, setMessage] = useState('')
  const [openEditId, setOpenEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<RewardForm>({
    name: '',
    description: '',
    threshold_amount: '',
    budget: '',
    max_claims: '',
    required_rank_id: '',
    is_active: true,
  })

  async function load() {
    const res = await api.get('/admin/rewards')
    const data = res.data as RewardsResponse
    setRewards(data.rewards ?? [])
    setRanks(data.ranks ?? [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  function startEdit(reward: RewardRow) {
    setOpenEditId(reward.id)
    setEditForm({
      name: reward.title ?? reward.name ?? '',
      description: reward.description ?? '',
      threshold_amount: String(reward.threshold_amount ?? ''),
      budget: reward.budget === null || reward.budget === undefined ? '' : String(reward.budget),
      max_claims: reward.max_claims === null || reward.max_claims === undefined ? '' : String(reward.max_claims),
      required_rank_id: reward.required_rank_id === null || reward.required_rank_id === undefined ? '' : String(reward.required_rank_id),
      is_active: Boolean(reward.is_active),
    })
  }

  async function saveEdit(e: React.FormEvent, id: number) {
    e.preventDefault()
    setMessage('')
    try {
      await api.put(`/admin/rewards/${id}`, {
        name: editForm.name,
        description: editForm.description || null,
        threshold_amount: editForm.threshold_amount === '' ? null : Number(editForm.threshold_amount),
        budget: editForm.budget === '' ? null : Number(editForm.budget),
        max_claims: editForm.max_claims === '' ? null : Number(editForm.max_claims),
        required_rank_id: editForm.required_rank_id === '' ? null : Number(editForm.required_rank_id),
        is_active: editForm.is_active,
      })
      setOpenEditId(null)
      await load()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setMessage(error.response?.data?.message ?? 'Update failed')
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Rewards catalogue</h1>
        <p className="section-sub">Edit travel places, card images, thresholds, budgets and the required rank per reward. Rank-to-reward mapping is deliberately manual.</p>
      </div>

      {message && <p className="flash-err mt-4">{message}</p>}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rewards.length === 0 ? (
          <div className="card card-pad text-center text-sm text-slate-400 sm:col-span-2 xl:col-span-3">No rewards configured yet.</div>
        ) : (
          rewards.map((reward) => (
            <div key={reward.id} className="group/tile card relative flex flex-col overflow-hidden transition hover:shadow-md">
              <div className="relative h-40 overflow-hidden">
                {reward.image ? (
                  <>
                    <img src={reward.image_url ?? reward.image} alt="" aria-hidden="true" className="h-full w-full object-cover transition duration-300 group-hover/tile:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/45 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <MapPin className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm backdrop-blur">
                  <span className={`h-1.5 w-1.5 rounded-full ${reward.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {reward.is_active ? 'active' : 'inactive'}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <h2 className="font-bold leading-tight text-navy-900">{reward.name}</h2>
                  {reward.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{reward.description}</p>}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Threshold</dt>
                    <dd className="text-sm font-bold text-navy-900">${formatWhole(reward.threshold_amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Budget</dt>
                    <dd className="text-sm font-bold text-navy-900">{reward.budget !== null ? `$${formatWhole(reward.budget)}` : 'unlimited'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Claims cap</dt>
                    <dd className="text-sm font-bold text-navy-900">{reward.max_claims ?? '∞'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Claims</dt>
                    <dd className="text-sm font-bold text-navy-900">{reward.claims_count}</dd>
                  </div>
                </dl>

                <details
                  className="group/edit mt-auto"
                  open={openEditId === reward.id}
                  onToggle={(e) => {
                    if (e.currentTarget.open && openEditId !== reward.id) startEdit(reward)
                  }}
                >
                  <summary className="btn btn-outline btn-sm w-full list-none [&::-webkit-details-marker]:hidden">
                    <Pencil className="h-4 w-4" />
                    Edit reward
                    <ChevronDown className="h-4 w-4 transition-transform group-open/edit:rotate-180" />
                  </summary>
                  <form onSubmit={(e) => saveEdit(e, reward.id)} className="mt-3 grid w-full gap-3">
                    <div>
                      <label className="label" htmlFor={`name-${reward.id}`}>Travel place (name)</label>
                      <input className="input" type="text" id={`name-${reward.id}`} name="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength={120} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`description-${reward.id}`}>Description</label>
                      <textarea className="input" id={`description-${reward.id}`} name="description" rows={2} maxLength={500} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`image-${reward.id}`}>Card image</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {reward.image && (
                          <img src={reward.image_url ?? reward.image} alt="" className="h-14 w-24 rounded-lg border border-slate-200 object-cover" />
                        )}
                        <input className="input flex-1" type="file" id={`image-${reward.id}`} name="image" accept="image/jpeg,image/png,image/webp,image/svg+xml" />
                      </div>
                      <p className="hint">Background shown on the member and public reward cards (jpg, png, webp or svg — max 2 MB). Leave empty to keep the current image.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor={`rank-${reward.id}`}>Required rank</label>
                      <select className="input" id={`rank-${reward.id}`} name="required_rank_id" value={editForm.required_rank_id} onChange={(e) => setEditForm({ ...editForm, required_rank_id: e.target.value })}>
                        <option value="">— none configured —</option>
                        {ranks.map((rank) => (
                          <option key={rank.id} value={rank.id}>{rank.name}</option>
                        ))}
                      </select>
                      <p className="hint">Members must hold this rank to claim the reward; none allows anyone.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor={`threshold-${reward.id}`}>Threshold (USD)</label>
                      <input className="input" type="number" step="0.01" min="0" id={`threshold-${reward.id}`} name="threshold_amount" value={editForm.threshold_amount} onChange={(e) => setEditForm({ ...editForm, threshold_amount: e.target.value })} />
                      <p className="hint">Qualifying volume a member must reach to unlock this reward.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor={`budget-${reward.id}`}>Budget (USD)</label>
                      <input className="input" type="number" step="0.01" min="0" id={`budget-${reward.id}`} name="budget" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} />
                      <p className="hint">Maximum total dollars payable for this reward; leave empty for no cap.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor={`max-claims-${reward.id}`}>Max claims</label>
                      <input className="input" type="number" min="0" id={`max-claims-${reward.id}`} name="max_claims" value={editForm.max_claims} onChange={(e) => setEditForm({ ...editForm, max_claims: e.target.value })} />
                      <p className="hint">Maximum times this reward can be claimed; leave empty for unlimited.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" name="is_active" value="1" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                      Active
                    </label>
                    <p className="hint">Inactive rewards are hidden from members and cannot be claimed.</p>
                    <div>
                      <button type="submit" className="btn btn-primary btn-sm">Save reward</button>
                    </div>
                  </form>
                </details>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
