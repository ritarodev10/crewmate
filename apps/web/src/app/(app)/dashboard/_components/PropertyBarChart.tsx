'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PropertyBar } from '@/lib/fixtures/kpiMetrics';

interface PropertyBarChartProps {
  data: PropertyBar[];
}

export function PropertyBarChart({ data }: PropertyBarChartProps) {
  const sorted = [...data].sort((a, b) => b.jobCount - a.jobCount);

  return (
    <ResponsiveContainer width="100%" height={sorted.length * 44}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
        barCategoryGap={12}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="propertyName"
          width={140}
          tick={{ fontSize: 14, fill: 'var(--color-ink)' }}
          axisLine={false}
          tickLine={false}
        />
        <Bar
          dataKey="jobCount"
          radius={[0, 4, 4, 0]}
          barSize={8}
          background={{ fill: 'var(--color-navy-fade)', radius: 4 }}
          label={{
            position: 'right',
            formatter: (value: number) => value,
            style: {
              fontSize: 13,
              fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
              fill: 'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums',
            },
          }}
        >
          {sorted.map((entry) => (
            <Cell key={entry.propertyId} fill="#D4A24C" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
