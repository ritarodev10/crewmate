'use client'

import { cn } from '@web/lib/utils'
import { Skeleton } from '@web/components/ui/skeleton'
import type { Session } from '@web/lib/session'
import type { DashboardSummaryData } from '@web/types/api'

interface KpiCardsProps {
  summary: DashboardSummaryData | null
  session: Session | null
}

interface KpiCardConfig {
  label: string
  teamLeadLabel: string
  value: string
  subtitle: string
}

export function KpiCards({ summary, session }: KpiCardsProps) {
  const isTeamLead = session?.role === 'TEAM_LEAD'

  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-line rounded-xl p-5 flex flex-col gap-2 shadow-sm"
          >
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-8 w-16 rounded mt-1" />
            <Skeleton className="h-3 w-32 rounded mt-1" />
          </div>
        ))}
      </div>
    )
  }

  const revenueFormatted = `€${(summary.todayRevenue / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

  const cards: KpiCardConfig[] = [
    {
      label: 'Total Jobs Today',
      teamLeadLabel: 'Team Jobs Today',
      value: String(summary.totalJobs),
      subtitle: `${summary.inProgressJobs} in progress · ${summary.scheduledJobs} scheduled`,
    },
    {
      label: 'Active Workers',
      teamLeadLabel: 'Team Members On Job',
      value: String(summary.activeWorkers),
      subtitle: `${summary.completedJobs} jobs completed today`,
    },
    {
      label: 'Completed Today',
      teamLeadLabel: 'Team Completed Today',
      value: String(summary.completedJobs),
      subtitle: `${summary.cancelledJobs} cancelled · ${summary.inProgressJobs} in progress`,
    },
    {
      label: 'Revenue Today',
      teamLeadLabel: 'Team Revenue Today',
      value: revenueFormatted,
      subtitle: `Profit: €${(summary.todayProfit / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
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
            <p className={cn('text-xs mt-1 font-medium text-muted')}>
              {card.subtitle}
            </p>
          </div>
        )
      })}
    </div>
  )
}
