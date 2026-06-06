'use client'

import { useState } from 'react'
import type { Job } from '@web/types/api'

type Tab = 'today' | 'week' | 'month'

interface EarningsCardProps {
  todayEarnings: number // euros (float)
  todayCompleted: number
  workerHourlyRate: number
}

const DAILY_GOAL = 400

function formatEur(amount: number): string {
  return `€${amount.toFixed(0)}`
}

export function EarningsCard({ todayEarnings, todayCompleted, workerHourlyRate }: EarningsCardProps) {
  const [tab, setTab] = useState<Tab>('today')

  const weekEarnings = todayEarnings * 5
  const monthEarnings = todayEarnings * 22

  const earnings =
    tab === 'today' ? todayEarnings : tab === 'week' ? weekEarnings : monthEarnings
  const goal =
    tab === 'today' ? DAILY_GOAL : tab === 'week' ? DAILY_GOAL * 5 : DAILY_GOAL * 22

  const progressPct = Math.min((earnings / goal) * 100, 100)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div className="m-4 rounded-2xl bg-surface shadow-md p-5">
      {/* Tab pills */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand text-white'
                : 'bg-zinc-100 text-muted hover:bg-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Earnings */}
      <p className="text-3xl font-bold text-default">{formatEur(earnings)}</p>
      <p className="text-sm text-muted mt-1">
        {tab === 'today'
          ? `${todayCompleted} job${todayCompleted !== 1 ? 's' : ''} completed today`
          : tab === 'week'
          ? `${todayCompleted * 5} jobs this week (est.)`
          : `${todayCompleted * 22} jobs this month (est.)`}
      </p>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {formatEur(earnings)} / {formatEur(goal)} {tab === 'today' ? 'daily' : tab === 'week' ? 'weekly' : 'monthly'} goal
        </p>
      </div>
    </div>
  )
}
