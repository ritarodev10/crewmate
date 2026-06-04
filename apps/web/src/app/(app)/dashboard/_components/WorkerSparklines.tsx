'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { WorkerSparkline } from '@/lib/fixtures/kpiMetrics';

interface WorkerSparklinesProps {
  data: WorkerSparkline[];
}

function Sparkline({ points }: { points: number[] }) {
  const chartData = points.map((value, index) => ({ day: index, value }));

  return (
    <div className="w-24 h-10 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1F3A5F"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WorkerSparklines({ data }: WorkerSparklinesProps) {
  const sorted = [...data].sort(
    (a, b) =>
      b.points.reduce((s, v) => s + v, 0) - a.points.reduce((s, v) => s + v, 0),
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-space-1 pb-space-3 border-b border-line">
        <span className="flex-1 text-micro text-muted uppercase tracking-wider">
          Worker
        </span>
        <span className="w-14 text-right text-micro text-muted uppercase tracking-wider">
          Jobs
        </span>
        <span className="w-24 text-right text-micro text-muted uppercase tracking-wider">
          Trend
        </span>
      </div>
      <div className="flex flex-col divide-y divide-line">
        {sorted.map((worker) => {
          const totalJobs = worker.points.reduce((s, v) => s + v, 0);
          return (
            <div
              key={worker.workerId}
              className="flex items-center py-space-3 px-space-1"
            >
              <span className="flex-1 text-body text-default truncate">
                {worker.workerName}
              </span>
              <span className="w-14 text-right font-mono text-small text-default tabular-nums">
                {totalJobs}
              </span>
              <Sparkline points={worker.points} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
