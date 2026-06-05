'use client'

import { cn } from '@web/lib/utils'
import type { Session } from '@web/lib/session'
import type { DASHBOARD_SUMMARY } from '@web/data/seed'

interface KpiCardsProps {
  summary: typeof DASHBOARD_SUMMARY
  session: Session | null
}

interface KpiCardConfig {
  label: string
  teamLeadLabel: string
  value: string
  delta: number
  deltaUnit: string
  direction: 'neutral' | 'goodUp' | 'goodDown'
}

function formatDelta(delta: number, unit: string, direction: 'neutral' | 'goodUp' | 'goodDown'): {
  text: string
  colorClass: string
  symbol: string
} {
  if (direction === 'neutral' || delta === 0) {
    const sign = delta > 0 ? '+' : delta < 0 ? '' : '±'
    return {
      text: `${sign}${Math.abs(delta)}${unit} vs yesterday`,
      colorClass: 'text-muted',
      symbol: delta === 0 ? '—' : delta > 0 ? '▲' : '▼',
    }
  }
  const isPositive = delta > 0
  const symbol = isPositive ? '▲' : '▼'
  const absVal = Math.abs(delta)
  const sign = isPositive ? '+' : '−'
  const colorClass =
    (direction === 'goodUp' && isPositive) || (direction === 'goodDown' && !isPositive)
      ? 'text-success'
      : 'text-danger'
  return {
    text: `${sign}${absVal}${unit} vs yesterday`,
    colorClass,
    symbol,
  }
}

export function KpiCards({ summary, session }: KpiCardsProps) {
  const isTeamLead = session?.role === 'TEAM_LEAD'

  const cards: KpiCardConfig[] = [
    {
      label: 'Total Jobs Today',
      teamLeadLabel: 'Team Jobs Today',
      value: String(summary.totalJobs),
      delta: summary.deltaYesterday.totalJobs,
      deltaUnit: '%',
      direction: 'neutral',
    },
    {
      label: 'Active Workers',
      teamLeadLabel: 'Team Members On Job',
      value: String(summary.activeWorkers),
      delta: summary.deltaYesterday.activeWorkers,
      deltaUnit: '%',
      direction: 'goodUp',
    },
    {
      label: 'On-Time Rate',
      teamLeadLabel: 'Team On-Time Rate',
      value: `${summary.onTimeRate}%`,
      delta: summary.deltaYesterday.onTimeRate,
      deltaUnit: ' pt',
      direction: 'goodUp',
    },
    {
      label: 'Revenue Today',
      teamLeadLabel: 'Team Revenue Today',
      value: `€${summary.revenue.toLocaleString('en-EU')}`,
      delta: summary.deltaYesterday.revenue,
      deltaUnit: '%',
      direction: 'goodUp',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const { text, colorClass, symbol } = formatDelta(card.delta, card.deltaUnit, card.direction)
        const cardLabel = isTeamLead ? card.teamLeadLabel : card.label

        return (
          <div
            key={card.label}
            className="bg-surface border border-line rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <p className="text-xs text-muted uppercase tracking-wide leading-none">
              {cardLabel}
            </p>
            <p className="text-3xl font-bold text-default tabular-nums leading-tight mt-1">
              {card.value}
            </p>
            <p className={cn('text-xs mt-1 font-medium', colorClass)}>
              <span className="mr-0.5">{symbol}</span>
              {text}
            </p>
          </div>
        )
      })}
    </div>
  )
}
