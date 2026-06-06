'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@web/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = 'today' | '7days'

interface DataPoint {
  label: string
  revenue: number
  profit: number
  isToday?: boolean
  isPartial?: boolean
}

// ---------------------------------------------------------------------------
// Static datasets
// ---------------------------------------------------------------------------

const HOURLY_DATA: DataPoint[] = [
  { label: '08:00', revenue: 320,  profit: 60  },
  { label: '09:00', revenue: 680,  profit: 128 },
  { label: '10:00', revenue: 1020, profit: 192 },
  { label: '11:00', revenue: 1200, profit: 228 },
  { label: '12:00', revenue: 1450, profit: 276 },
  { label: '13:00', revenue: 1680, profit: 320 },
  { label: '14:00', revenue: 1890, profit: 360 },
  { label: '15:00', revenue: 2200, profit: 420 },
  { label: '16:00', revenue: 2560, profit: 488 },
  { label: '17:00', revenue: 2890, profit: 552, isPartial: true },
]

// Raw 8-point dataset for last 7 days (indices 0 = T-7, 7 = Today)
const WEEKLY_RAW = [
  { revenue: 5240, profit: 980  },
  { revenue: 5890, profit: 1102 },
  { revenue: 4960, profit: 924  },
  { revenue: 6320, profit: 1210 },
  { revenue: 6080, profit: 1148 },
  { revenue: 5620, profit: 1058 },
  { revenue: 7020, profit: 1340 },
  { revenue: 2890, profit: 552, isPartial: true },
]

function buildWeeklyData(): DataPoint[] {
  const now = new Date()
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return WEEKLY_RAW.map((raw, i) => {
    const daysAgo = 7 - i
    if (daysAgo === 0) {
      return { label: 'Today', revenue: raw.revenue, profit: raw.profit, isToday: true, isPartial: true }
    }
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    const dayName = weekdays[d.getDay()]
    const dayNum = d.getDate()
    return { label: `${dayName} ${dayNum}`, revenue: raw.revenue, profit: raw.profit }
  })
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const revenue = payload.find(p => p.name === 'revenue')?.value ?? 0
  const profit = payload.find(p => p.name === 'profit')?.value ?? 0
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0'
  const isPartial = label === 'Today' || label === '17:00'

  const displayLabel = isPartial ? `${label} (partial)` : label

  return (
    <div className="rounded-lg bg-white shadow-md border border-line p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-default mb-2">{displayLabel}</p>
      <div className="border-t border-line my-2" />
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full bg-blue-500" />
            Revenue
          </span>
          <span className="text-xs font-medium tabular-nums text-default">
            {formatCurrency(revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            Profit
          </span>
          <span className="text-xs font-medium tabular-nums text-default">
            {formatCurrency(profit)}
          </span>
        </div>
      </div>
      <div className="border-t border-line my-2" />
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted">Margin</span>
        <span className="text-xs font-medium tabular-nums text-default">{margin}%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `€${new Intl.NumberFormat('en-EU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)}`
  }
  return `€${value}`
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`
  }
  return `€${value}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenueTrendChart() {
  const [period, setPeriod] = useState<Period>('today')

  const weeklyData = buildWeeklyData()
  const data: DataPoint[] = period === 'today' ? HOURLY_DATA : weeklyData

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-default">Revenue Trend</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="inline-block size-2 rounded-full bg-blue-500" />
              Revenue
            </span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="inline-block size-2 rounded-full bg-green-500" />
              Profit
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-1">
          {(['today', '7days'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all',
                period === p
                  ? 'bg-surface text-default shadow-sm border border-line'
                  : 'text-muted hover:text-default'
              )}
            >
              {p === 'today' ? 'Today' : 'Last 7 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            horizontal={true}
            vertical={false}
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />

          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />

          <Area
            type="monotone"
            dataKey="profit"
            name="profit"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#profGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
