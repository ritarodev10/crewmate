import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

type TrendDirection = 'up' | 'down' | 'flat';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend: TrendDirection;
  trendDelta: string;
  className?: string;
}

const TREND_STYLES: Record<TrendDirection, string> = {
  up: 'text-success bg-success-fade',
  down: 'text-danger bg-danger-fade',
  flat: 'text-muted bg-line',
};

const TrendIcon = ({ trend }: { trend: TrendDirection }) => {
  if (trend === 'up') return <TrendingUp size={12} strokeWidth={1.75} aria-hidden="true" />;
  if (trend === 'down') return <TrendingDown size={12} strokeWidth={1.75} aria-hidden="true" />;
  return <Minus size={12} strokeWidth={1.75} aria-hidden="true" />;
};

export function KpiCard({ label, value, unit, trend, trendDelta, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-space-6',
        className,
      )}
    >
      <p className="text-small text-muted">{label}</p>
      <div className="mt-space-2 flex items-end gap-space-2">
        <span className="text-h1 text-default font-bold tabular-nums">{value}</span>
        {unit && <span className="text-small text-muted pb-space-1">{unit}</span>}
      </div>
      <div className="mt-space-3 flex items-center gap-space-2">
        <span
          className={cn(
            'inline-flex items-center gap-space-1 px-space-2 py-space-1 rounded-sm text-micro font-semibold',
            TREND_STYLES[trend],
          )}
        >
          <TrendIcon trend={trend} />
        </span>
        <span className="text-small text-muted">{trendDelta}</span>
      </div>
    </div>
  );
}
