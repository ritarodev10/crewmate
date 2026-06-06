'use client'

import { RevenueTrendChart } from './RevenueTrendChart'
import { RevenueBreakdownTable } from './RevenueBreakdownTable'
import { cn } from '@web/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeltaDirection = 'up' | 'down' | 'neutral'

interface KpiCardProps {
  label: string
  value: string
  delta: string
  direction: DeltaDirection
  accentColor?: 'blue' | 'green' | 'neutral'
}

// ---------------------------------------------------------------------------
// Delta helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, delta, direction, accentColor = 'neutral' }: KpiCardProps) {
  const accentBar: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    neutral: 'bg-gray-300',
  }

  return (
    <div className="relative flex-1 min-w-0 rounded-xl border border-line bg-surface p-5 overflow-hidden">
      {/* Accent bar */}
      <span
        className={cn(
          'absolute left-0 top-4 bottom-4 w-1 rounded-r-full',
          accentBar[accentColor]
        )}
      />

      <p className="text-xs font-medium text-muted uppercase tracking-wider pl-3">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-default pl-3 tabular-nums leading-none">
        {value}
      </p>
      <p className={cn('mt-1.5 text-xs font-medium pl-3', deltaClass(direction))}>
        <span className="mr-0.5">{deltaIcon(direction)}</span>
        {delta}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI data
// ---------------------------------------------------------------------------

const KPI_CARDS: KpiCardProps[] = [
  {
    label: 'Total Revenue',
    value: '€2,890',
    delta: '-58.8% vs yesterday',
    direction: 'down',
    accentColor: 'blue',
  },
  {
    label: 'Total Profit',
    value: '€552',
    delta: '-58.8% vs yesterday',
    direction: 'down',
    accentColor: 'green',
  },
  {
    label: 'Profit Margin',
    value: '19.1%',
    delta: '0.0pp vs yesterday',
    direction: 'neutral',
    accentColor: 'neutral',
  },
  {
    label: 'Jobs Billed',
    value: '15',
    delta: '-21 vs yesterday',
    direction: 'down',
    accentColor: 'neutral',
  },
]

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
  return (
    <div className="space-y-6">
      {/* Heading row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-default">Revenue</h1>
          <p className="text-sm text-muted mt-0.5">
            Platform earnings for today · Milan, Italy
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* KPI cards — 4 in a row on desktop, 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {KPI_CARDS.map(card => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Revenue trend chart */}
      <RevenueTrendChart />

      {/* Breakdown table */}
      <RevenueBreakdownTable />
    </div>
  )
}
