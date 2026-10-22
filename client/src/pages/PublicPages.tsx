import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CheckCircle2, Plane } from 'lucide-react'
import { api } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'

interface GenerationRate {
  generation_from: number
  generation_to: number
  rate: number
}

interface PublicRank {
  id: number
  code: string
  name: string
  level: number
  monthly_salary: number
  requirements: { type: string; value: number; label: string; sort_order: number }[]
}

interface PublicReward {
  id: number
  name: string
  description: string
  threshold_amount: number
  image: string | null
  image_url: string | null
  is_active: boolean
}

function formatRate(rate: number) {
  return `${String(Number(rate.toFixed(2)).toString().replace(/\.0+$/, ''))}%`
}

export function MarketingPlan() {
  usePageTitle('Marketing Plan')

  const [rates, setRates] = useState<GenerationRate[]>([])
  const [plan, setPlan] = useState<{ version: number } | null>(null)

  useEffect(() => {
    api
      .get('/public/config')
      .then((res) => {
        setRates(res.data?.commission?.generation_rates ?? [])
        setPlan(res.data?.plan ?? null)
      })
      .catch(() => setRates([]))
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <span className="badge badge-info">Compensation</span>
      <h1 className="mt-3 page-title">Marketing Plan</h1>
      <p className="section-sub max-w-3xl">
        {'The NEXORA marketing plan pays generation bonuses on verified, commission-eligible\n'}
        {'sale volume across twenty generations of your downline.'}
      </p>

      <div className="mt-8 card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-navy-900">Generation bonus rates</h2>
          {plan ? (
            <span className="badge badge-warn">Active plan: v{plan.version}</span>
          ) : (
            <span className="badge badge-muted">Draft rates (config default)</span>
          )}
        </div>

        <div className="table-wrap mt-5">
          <table className="data-table">
            <thead>
              <tr>
                <th>Generation range</th>
                <th className="text-right">Bonus rate</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={`${rate.generation_from}-${rate.generation_to}`}>
                  <td className="font-semibold text-navy-900">
                    {rate.generation_from === rate.generation_to
                      ? `Generation ${rate.generation_from}`
                      : `Generations ${rate.generation_from} – ${rate.generation_to}`}
                  </td>
                  <td className="text-right text-lg font-bold text-accent-600">{formatRate(rate.rate)}</td>
                  <td className="text-sm text-slate-500">Verified eligible sale amount</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card card-pad">
          <h3 className="font-bold text-navy-900">How bonuses are calculated</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Only verified transactions with eligible amounts qualify.</li>
            <li>Each commission is attributed to the correct generation of your downline.</li>
            <li>Commissions are idempotent — a transaction can never pay twice.</li>
            <li>Commissions move pending → approved → paid, visible in your ledger at every step.</li>
          </ul>
        </div>
        <div className="card card-pad">
          <h3 className="font-bold text-navy-900">Important disclosures</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>No income is earned from recruitment alone.</li>
            <li>Deposits are never treated as commissionable sales.</li>
            <li>The final plan must be activated by an administrator before live processing.</li>
            <li>
              See the{' '}
              <Link to="/income-disclosure" className="font-semibold text-accent-600">
                income disclosure
              </Link>{' '}
              for earning context.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/rank-plan" className="btn btn-primary">
          See the rank plan
        </Link>
        <Link to="/register" className="btn btn-outline">
          Join now
        </Link>
      </div>
    </div>
  )
}

export function RankPlan() {
  usePageTitle('Rank Plan')

  const [ranks, setRanks] = useState<PublicRank[]>([])

  useEffect(() => {
    api
      .get('/public/config')
      .then((res) => setRanks(res.data?.ranks ?? []))
      .catch(() => setRanks([]))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <span className="badge badge-info">Recognition</span>
      <h1 className="mt-3 page-title">Rank Plan</h1>
      <p className="section-sub max-w-3xl">
        {'Eight ranks from Rise to Nexora Direct Chairman. Qualification is measured on your downline —\n'}
        {'never on recruitment alone — and each rank carries a fixed monthly salary once approved.'}
      </p>

      <div className="mt-8 space-y-5">
        {ranks.length === 0 ? (
          <p className="text-sm text-slate-400">Rank configuration will appear after seeding.</p>
        ) : (
          ranks.map((rank) => (
            <div key={rank.id} className="card card-pad flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4 md:w-64">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-sm font-black text-accent-400">
                  {rank.level}
                </span>
                <div>
                  <h2 className="font-bold text-navy-900">{rank.name}</h2>
                  <p className="text-xs text-slate-400">Monthly salary</p>
                  <p className="text-lg font-black text-gold-500">${Math.round(rank.monthly_salary).toLocaleString('en-US')}</p>
                </div>
              </div>

              <div className="flex-1">
                {rank.requirements.length === 0 ? (
                  <p className="text-sm text-slate-400">No qualification requirements configured for this rank.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {rank.requirements.map((requirement) => (
                      <li
                        key={`${rank.id}-${requirement.sort_order}-${requirement.type}`}
                        className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                        <span>{requirement.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <strong>Note:</strong>
        {' monthly salaries require independent monthly qualification and are paid only after\n'}
        {'finance approval. Rank settings may be adjusted by administrators; the table above reflects live configuration.'}
      </div>
    </div>
  )
}

export function PublicRewards() {
  usePageTitle('Travel Rewards')

  const [rewards, setRewards] = useState<PublicReward[]>([])

  useEffect(() => {
    api
      .get('/public/config')
      .then((res) => setRewards(res.data?.rewards ?? []))
      .catch(() => setRewards([]))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <span className="badge badge-warn">Recognition</span>
      <h1 className="mt-3 page-title">Travel Rewards</h1>
      <p className="section-sub max-w-3xl">
        {'NEXORA funds international travel rewards for members who reach defined\n'}
        {'production milestones. Claims are reviewed manually before any benefit is issued.'}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {rewards.length === 0 ? (
          <p className="text-sm text-slate-400">The reward catalogue is being configured.</p>
        ) : (
          rewards.map((reward) => (
            <div key={reward.id} className="card card-pad relative flex flex-col overflow-hidden">
              {reward.image && (
                <>
                  <img
                    src={reward.image_url ?? reward.image}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/55 via-white/85 to-white/95"></div>
                </>
              )}
              <div className="relative flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/20 text-gold-500">
                    <Plane className="h-6 w-6" />
                  </span>
                  <span className={`badge ${reward.is_active ? 'badge-success' : 'badge-muted'}`}>
                    {reward.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold text-navy-900">{reward.name}</h2>
                <p className="mt-2 flex-1 text-sm text-slate-600">{reward.description}</p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="text-slate-500">Default threshold</span>
                  <span className="money">${Math.round(reward.threshold_amount).toLocaleString('en-US')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Required rank</span>
                  <span className="badge badge-warn">Mapping pending admin config</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/rank-plan" className="btn btn-primary">
          See rank requirements
        </Link>
        <Link to="/register" className="btn btn-outline">
          Join NEXORA
        </Link>
      </div>
    </div>
  )
}
