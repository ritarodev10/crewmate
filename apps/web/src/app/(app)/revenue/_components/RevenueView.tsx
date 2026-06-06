'use client'

import { RevenueTrendChart } from './RevenueTrendChart'
import { RevenueBreakdownTable } from './RevenueBreakdownTable'
import { useRevenue } from '../_hooks/use-revenue'
import { Skeleton } from '@web/components/ui/skeleton'
import { cn } from '@web/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centsToEuros(cents: number): string {
  return `€${(cents / 100).toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function deltaText(today: number, yesterday: number): { text: string; direction: 'up' | 'down' | 'neutral' } {
  if (yesterday === 0) return { text: 'No data yesterday', direction: 'neutral' }
  const pct = ((today - yesterday) / yesterday) * 100
  const sign = pct >= 0 ? '+' : ''
  return {
    text: `${sign}${pct.toFixed(1)}% vs yesterday`,
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  }
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

type DeltaDirection = 'up' | 'down' | 'neutral'

interface KpiCardProps {
  label: string
  value: string
  delta: string
  direction: DeltaDirection
  accentColor?: 'blue' | 'green' | 'neutral'
}

function deltaClass(direction: DeltaDirection): string {
  if (direction === 'up') return 'text-green-600'
  if (direction === 'down') return 'text-red-500'
  return 'text-muted'
}

function deltaIcon(direction: DeltaDirection): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return '─'
}

function KpiCard({ label, value, delta, direction, accentColor = 'neutral' }: KpiCardProps) {
  const accentBar: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    neutral: 'bg-gray-300',
  }

  return (
    <div className="relative flex-1 min-w-0 rounded-xl border border-line bg-surface p-5 overflow-hidden">
      <span className={cn('absolute left-0 top-4 bottom-4 w-1 rounded-r-full', accentBar[accentColor])} />
      <p className="text-xs font-medium text-muted uppercase tracking-wider pl-3">{label}</p>
      <p className="mt-2 text-2xl font-bold text-default pl-3 tabular-nums leading-none">{value}</p>
      <p className={cn('mt-1.5 text-xs font-medium pl-3', deltaClass(direction))}>
        <span className="mr-0.5">{deltaIcon(direction)}</span>
        {delta}
      </p>
    </div>
  )
}

function KpiCardSkeleton() {
  return (
    <div className="relative flex-1 min-w-0 rounded-xl border border-line bg-surface p-5 overflow-hidden">
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gray-200" />
      <Skeleton className="h-3 w-24 rounded ml-3" />
      <Skeleton className="h-7 w-20 rounded mt-3 ml-3" />
      <Skeleton className="h-3 w-32 rounded mt-2 ml-3" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live badge
// ---------------------------------------------------------------------------

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      Live
    </span>
  )
}

// ---------------------------------------------------------------------------
// RevenueView
// ---------------------------------------------------------------------------

export function RevenueView() {
  const { data, isLoading } = useRevenue()

  const yesterday = data?.trend[data.trend.length - 2]
  const totalJobsBilled = data?.byJobType.reduce((sum, r) => sum + r.jobCount, 0) ?? 0
  const yesterdayJobsBilled = 0 // API doesn't provide yesterday job count separately

  const margin = data
    ? data.today.revenue > 0
      ? ((data.today.profit / data.today.revenue) * 100).toFixed(1) + '%'
      : '0.0%'
    : '—'

  const revDelta = data && yesterday ? deltaText(data.today.revenue, yesterday.revenue) : { text: '—', direction: 'neutral' as const }
  const profDelta = data && yesterday ? deltaText(data.today.profit, yesterday.profit) : { text: '—', direction: 'neutral' as const }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <LiveBadge />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Total Revenue"
              value={data ? centsToEuros(data.today.revenue) : '€0'}
              delta={revDelta.text}
              direction={revDelta.direction}
              accentColor="blue"
            />
            <KpiCard
              label="Total Profit"
              value={data ? centsToEuros(data.today.profit) : '€0'}
              delta={profDelta.text}
              direction={profDelta.direction}
              accentColor="green"
            />
            <KpiCard
              label="Profit Margin"
              value={margin}
              delta="vs revenue"
              direction="neutral"
              accentColor="neutral"
            />
            <KpiCard
              label="Jobs Billed"
              value={String(totalJobsBilled)}
              delta={yesterdayJobsBilled > 0 ? deltaText(totalJobsBilled, yesterdayJobsBilled).text : 'completed today'}
              direction="neutral"
              accentColor="neutral"
            />
          </>
        )}
      </div>

      <RevenueTrendChart trend={data?.trend ?? null} isLoading={isLoading} />
      <RevenueBreakdownTable byJobType={data?.byJobType ?? null} isLoading={isLoading} />
    </div>
  )
}
