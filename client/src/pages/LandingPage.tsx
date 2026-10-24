import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BadgeCheck, ChevronRight, Coins, Gift, Link2, TrendingUp, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'

export default function LandingPage() {
  const [config, setConfig] = useState<any>(null)

  usePageTitle('Home')

  useEffect(() => {
    api.get('/public/config').then((res) => setConfig(res.data)).catch(() => setConfig(null))
  }, [])

  const rankCount = config?.ranks?.length ?? 8
  const rewardCount = config?.rewards?.length ?? 6

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-white via-white to-surface dark:border-slate-700/70 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="nx-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-400/15 blur-3xl sm:h-96 sm:w-96"></div>
          <div className="nx-blob nx-blob-slow absolute -right-24 top-40 h-72 w-72 rounded-full bg-navy-900/10 blur-3xl sm:h-96 sm:w-96"></div>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <h1 className="nx-rise text-balance text-4xl font-black leading-[1.08] tracking-tight text-navy-950 dark:text-white sm:text-5xl xl:text-6xl">
              Build your network with{' '}
              <span className="bg-gradient-to-r from-accent-500 via-accent-400 to-accent-600 bg-clip-text text-transparent">
                transparent
              </span>{' '}
              compensation.
            </h1>
            <p className="nx-rise nx-rise-1 mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
              {'NEXORA tracks referrals, generation bonuses, ranks, monthly salaries\n'}
              {'and travel rewards with an auditable double-entry ledger — every payout backed by a verified sale.'}
            </p>
            <div className="nx-rise nx-rise-2 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/register" className="btn btn-accent w-full px-6 py-3 text-center text-base sm:w-auto">
                Start free registration
              </Link>
              <Link to="/marketing-plan" className="btn btn-outline w-full px-6 py-3 text-center text-base sm:w-auto">
                Read the marketing plan
              </Link>
            </div>
            <dl className="nx-rise nx-rise-3 mt-10 grid grid-cols-3 gap-3 border-t border-slate-200 pt-6 sm:gap-6">
              <div>
                <dt className="stat-label text-[10px] sm:text-xs">Generations tracked</dt>
                <dd className="text-xl font-black text-navy-900 dark:text-white sm:text-3xl" data-count-to="20">
                  20
                </dd>
              </div>
              <div>
                <dt className="stat-label text-[10px] sm:text-xs">Rank levels</dt>
                <dd className="text-xl font-black text-navy-900 dark:text-white sm:text-3xl" data-count-to={rankCount}>
                  {rankCount}
                </dd>
              </div>
              <div>
                <dt className="stat-label text-[10px] sm:text-xs">Reward trips</dt>
                <dd className="text-xl font-black text-navy-900 dark:text-white sm:text-3xl" data-count-to={rewardCount}>
                  {rewardCount}
                </dd>
              </div>
            </dl>
          </div>

          <div className="nx-rise nx-rise-2 card card-pad transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Explore the plan</h2>
            <div className="mt-4 space-y-2">
              <Link
                to="/marketing-plan"
                className="group flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-accent-400 transition group-hover:bg-accent-500 group-hover:text-navy-950">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-navy-900 dark:text-white">Marketing plan</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">
                    Generation bonus rates &amp; how commissions are earned
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent-500" />
              </Link>
              <Link
                to="/rank-plan"
                className="group flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-accent-400 transition group-hover:bg-accent-500 group-hover:text-navy-950">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-navy-900 dark:text-white">Rank &amp; salary plan</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">Eight ranks from Rise to NDC with monthly salaries</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent-500" />
              </Link>
              <Link
                to="/rewards"
                className="group flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-accent-400 transition group-hover:bg-accent-500 group-hover:text-navy-950">
                  <Gift className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-navy-900 dark:text-white">Travel rewards</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">Company-funded trips unlocked at rank milestones</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent-500" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="page-title">How NEXORA works</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Three simple steps from registration to your first payout.</p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="card card-pad relative transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <span className="absolute -top-3 left-6 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-black text-navy-950 shadow-sm">
              01
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-accent-400">
              <Link2 className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-bold text-navy-900">Join with a sponsor</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Register with a sponsor member code. Your referral relationship is recorded immutably in the referral closure table.
            </p>
          </div>
          <div className="card card-pad relative transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <span className="absolute -top-3 left-6 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-black text-navy-950 shadow-sm">
              02
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-accent-400">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-bold text-navy-900">Verify &amp; transact</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Complete identity verification, then record verified sales that qualify for generation bonuses.
            </p>
          </div>
          <div className="card card-pad relative transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <span className="absolute -top-3 left-6 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-black text-navy-950 shadow-sm">
              03
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-accent-400">
              <Coins className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-bold text-navy-900">Earn &amp; withdraw</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Commissions flow pending → approved → paid into your wallet ledger, then withdraw through a reviewed request.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy-950">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="nx-blob absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent-500/20 blur-3xl"></div>
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">Ready to join NEXORA?</h2>
          <p className="max-w-xl text-slate-400">
            Registration takes a minute. You will receive a unique member code and referral link immediately.
          </p>
          <div className="mt-2 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link to="/register" className="btn btn-accent px-7 py-3">
              Create your account
            </Link>
            <Link to="/contact" className="btn btn-outline border-white/20 bg-transparent px-7 py-3 text-white hover:bg-white/10">
              Talk to support
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
