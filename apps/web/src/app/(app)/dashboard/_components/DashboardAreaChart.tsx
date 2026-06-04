'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import type { ChartPoint } from '@/lib/fixtures/kpiMetrics';

interface DashboardAreaChartProps {
  data: ChartPoint[];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="rounded-md border border-line bg-surface p-space-3 shadow-pop">
      <p className="text-body font-semibold text-default tabular-nums">{total} jobs</p>
      <p className="text-small text-muted">{formatDateLabel(label)}</p>
      <div className="mt-space-2 flex flex-col gap-space-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-space-4">
            <div className="flex items-center gap-space-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-small text-default capitalize">{entry.dataKey}</span>
            </div>
            <span className="text-small text-default tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) {
  if (!payload) return null;

  return (
    <div className="mt-space-4 flex items-center justify-center gap-space-4">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-space-2">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-small text-default capitalize">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardAreaChart({ data }: DashboardAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F3A5F" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#1F3A5F" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradScheduled" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A24C" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#D4A24C" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-line)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 13, fill: 'var(--color-muted)' }}
          axisLine={{ stroke: 'var(--color-line)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 13, fill: 'var(--color-muted)' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <RechartsTooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'var(--color-line-strong)', strokeDasharray: '4 4' }}
        />
        <Legend content={<CustomLegend />} />
        <Area
          type="monotone"
          dataKey="completed"
          stackId="jobs"
          stroke="#1F3A5F"
          strokeWidth={2}
          fill="url(#gradCompleted)"
        />
        <Area
          type="monotone"
          dataKey="scheduled"
          stackId="jobs"
          stroke="#D4A24C"
          strokeWidth={2}
          fill="url(#gradScheduled)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
