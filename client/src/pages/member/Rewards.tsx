import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Plane } from 'lucide-react'

interface Reward {
  id: number
  title?: string
  name?: string
  description?: string
  cost?: number
  threshold_amount?: number
  image_path?: string
  requiredRank?: { name: string }
}

interface EligibilityItem {
  reward: Reward
  eligible: boolean
  reason?: string
  claim?: { status: string; created_at?: string }
}

export default function Rewards() {
  usePageTitle('Rewards')
  const [eligibility, setEligibility] = useState<EligibilityItem[]>([])
  const [note, setNote] = useState('')

  async function load() {
    try {
      const res = await api.get('/member/rewards')
      if (res.data.eligibility) {
        setEligibility(res.data.eligibility)
      } else {
        const rewards = res.data.rewards || []
        const claims = res.data.claims || []
        setEligibility(rewards.map((r: any) => ({
          reward: r,
          eligible: true,
          claim: claims.find((c: any) => c.reward_id === r.id || c.title === r.title),
        })))
      }
    } catch {
      setEligibility([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function claimReward(rewardId: number) {
    try {
      await api.post(`/member/rewards/${rewardId}/claim`, { note: note || undefined })
      setNote('')
      await load()
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div>
        <h1 className="page-title">Travel rewards</h1>
        <p className="section-sub">Claim company-funded travel rewards when you meet the milestone. Claims are reviewed before approval.</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {eligibility.length === 0 ? (
          <p className="text-sm text-slate-400">No active rewards configured.</p>
        ) : (
          eligibility.map((item) => {
            const reward = item.reward
            const name = reward.name || reward.title
            return (
              <div key={reward.id} className="card card-pad relative flex flex-col overflow-hidden">
                <div className="relative flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400/20 text-gold-500">
                      <Plane className="h-5 w-5" />
                    </span>
                    <span className={`badge ${item.eligible ? 'badge-success' : 'badge-muted'}`}>
                      {item.eligible ? 'Eligible' : 'Locked'}
                    </span>
                  </div>

                  <h2 className="mt-4 font-bold text-navy-900">{name}</h2>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{reward.description}</p>

                  <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Threshold</dt>
                      <dd className="money">${Number(reward.threshold_amount ?? reward.cost ?? 0).toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Required rank</dt>
                      <dd className="font-semibold text-navy-900">{reward.requiredRank?.name || 'Pending mapping'}</dd>
                    </div>
                    {item.claim ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Your claim</dt>
                        <dd><span className="badge badge-info">{item.claim.status}</span></dd>
                      </div>
                    ) : null}
                  </dl>

                  {!item.eligible && item.reason ? (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{item.reason}</p>
                  ) : null}

                  <div className="mt-4">
                    {item.eligible && !item.claim ? (
                      <form onSubmit={(e) => { e.preventDefault(); claimReward(reward.id) }} className="space-y-2">
                        <input className="input" type="text" maxLength={1000} placeholder="Optional note for reviewers" value={note} onChange={(e) => setNote(e.target.value)} />
                        <p className="hint">Anything the reviewers should know about this claim. Leave empty if not needed.</p>
                        <button type="submit" className="btn btn-accent w-full">Claim this reward</button>
                      </form>
                    ) : item.claim ? (
                      <p className="text-center text-xs text-slate-400">Claim submitted.</p>
                    ) : (
                      <button type="button" className="btn btn-outline w-full" disabled>Not yet claimable</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
