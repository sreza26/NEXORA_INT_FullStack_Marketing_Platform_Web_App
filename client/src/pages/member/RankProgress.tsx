import { useEffect, useState } from 'react'
import { api, money } from '../../lib/api'
import { usePageTitle } from '../../lib/usePageTitle'
import { Award, CheckCircle2, CircleDashed } from 'lucide-react'

interface Requirement {
  satisfied: boolean
  label: string
  actual: number
  required: number
}

interface Rank {
  id: number
  name: string
  level: number
  monthly_salary?: number
}

export default function RankProgress() {
  usePageTitle('Rank Progress')
  const [progress, setProgress] = useState<{ current: Rank | null; next: Rank | null; requirements: Requirement[] }>({ current: null, next: null, requirements: [] })
  const [metrics, setMetrics] = useState<any>({})
  const [ranks, setRanks] = useState<Rank[]>([])
  const [achievements, setAchievements] = useState<any[]>([])

  useEffect(() => {
    api.get('/member/rank-progress').then((res) => {
      setProgress(res.data.progress || { current: null, next: null, requirements: [] })
      setMetrics(res.data.metrics || {})
      setRanks(res.data.ranks || [])
      setAchievements(res.data.achievements || [])
    }).catch(() => undefined)
  }, [])

  return (
    <>
      <div>
        <h1 className="page-title">Rank progress</h1>
        <p className="section-sub">
          Current rank: <strong className="text-navy-900">{progress.current?.name || 'Unranked'}</strong>
          {progress.next ? <> &middot; Working toward <strong className="text-navy-900">{progress.next.name}</strong></> : null}
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <h2 className="font-bold text-navy-900">Qualification metrics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Direct links</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{metrics.direct_links_count || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Downline members</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{metrics.downline_members || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Lifetime volume</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{money(Number(metrics.downline_volume_lifetime || 0))}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Period volume</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{money(Number(metrics.downline_volume_period || 0))}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Max downline depth</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{metrics.max_downline_depth || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="stat-label">Has sponsor</p>
              <p className={`mt-1 text-xl font-bold ${metrics.has_direct_sponsor ? 'text-emerald-600' : 'text-rose-600'}`}>{metrics.has_direct_sponsor ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {progress.requirements && progress.requirements.length > 0 ? (
            <>
              <h3 className="mt-7 font-bold text-navy-900">Next rank requirements</h3>
              <div className="mt-3 space-y-3">
                {progress.requirements.map((req, idx) => {
                  const pct = req.required > 0 ? Math.min(100, Math.round((Number(req.actual) / Number(req.required)) * 100)) : (req.satisfied ? 100 : 0)
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          {req.satisfied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-slate-300" />}
                          {req.label}
                        </span>
                        <span className="tabular-nums text-slate-500">
                          {Number(req.actual).toFixed(2)} / {Number(req.required).toFixed(2)}
                        </span>
                      </div>
                      <div className="progress-track mt-1.5">
                        <div className="progress-fill" style={{ width: pct + '%' }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Rank ladder</h2>
            <ol className="mt-3 space-y-2">
              {ranks.map((item) => (
                <li key={item.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${progress.current?.id === item.id ? 'bg-accent-500/10 font-bold text-accent-700' : 'bg-slate-50 text-slate-600'}`}>
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-navy-900 text-[10px] font-black text-accent-400">{item.level}</span>
                    {item.name}
                  </span>
                  <span className="tabular-nums">${Number(item.monthly_salary || 0).toLocaleString()}/mo</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card card-pad">
            <h2 className="font-bold text-navy-900">Achievement history</h2>
            <div className="mt-3 space-y-3">
              {achievements.length === 0 ? (
                <p className="text-sm text-slate-400">No ranks achieved yet. Keep building verified volume.</p>
              ) : (
                achievements.map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-gold-500" />
                      <span className="text-sm font-semibold text-navy-900">{achievement.rank_name || achievement.rank?.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{achievement.achieved_at ? new Date(achievement.achieved_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
