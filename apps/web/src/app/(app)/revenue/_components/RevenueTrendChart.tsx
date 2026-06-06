'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@web/components/ui/skeleton'
import type { RevenueTrendPoint } from '@web/types/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  const euros = cents / 100
  if (euros >= 1000) {
    return `€${new Intl.NumberFormat('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(euros)}`
  }
  return `€${euros.toFixed(0)}`
}

function formatYAxis(cents: number): string {
  const euros = cents / 100
  if (euros >= 1000) return `€${(euros / 1000).toFixed(0)}k`
  return `€${euros.toFixed(0)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return d.toLocaleDateString('en-EU', { weekday: 'short', day: 'numeric' })
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

  return (
    <div className="rounded-lg bg-white shadow-md border border-line p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-default mb-2">{label}</p>
      <div className="border-t border-line my-2" />
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full bg-blue-500" />Revenue
          </span>
          <span className="text-xs font-medium tabular-nums text-default">{formatCurrency(revenue)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full bg-green-500" />Profit
          </span>
          <span className="text-xs font-medium tabular-nums text-default">{formatCurrency(profit)}</span>
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
// Component
// ---------------------------------------------------------------------------

interface RevenueTrendChartProps {
  trend: RevenueTrendPoint[] | null
  isLoading: boolean
}

export function RevenueTrendChart({ trend, isLoading }: RevenueTrendChartProps) {
  const chartData = (trend ?? []).map(p => ({
    label: formatDate(p.date),
    revenue: p.revenue,
    profit: p.profit,
  }))

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-default">Revenue Trend</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="inline-block size-2 rounded-full bg-blue-500" />Revenue
            </span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="inline-block size-2 rounded-full bg-green-500" />Profit
            </span>
          </div>
        </div>
        <span className="text-xs text-muted">Last 8 days</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[280px] w-full rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <CartesianGrid horizontal vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={8} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="profit" name="profit" stroke="#22c55e" strokeWidth={2} fill="url(#profGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
