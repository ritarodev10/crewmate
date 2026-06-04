import { CalendarDays } from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { Button } from '@/components/ui/button';
import {
  FIXTURE_KPI_CARDS,
  FIXTURE_CHART_POINTS,
  FIXTURE_PROPERTY_BARS,
  FIXTURE_WORKER_SPARKLINES,
} from '@/lib/fixtures';
import { DashboardAreaChart } from './_components/DashboardAreaChart';
import { PropertyBarChart } from './_components/PropertyBarChart';
import { WorkerSparklines } from './_components/WorkerSparklines';
import { ExportButton } from './_components/ExportButton';

const kpiCards = FIXTURE_KPI_CARDS;
const chartPoints = FIXTURE_CHART_POINTS;
const propertyBars = FIXTURE_PROPERTY_BARS;
const workerSparklines = FIXTURE_WORKER_SPARKLINES;

export default function DashboardPage() {
  return (
    <div className="p-space-8 max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-bold text-default text-balance">Overview</h1>
        <div className="flex items-center gap-space-3">
          <Button variant="outline" size="default">
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Last 30 days</span>
          </Button>
          <ExportButton />
        </div>
      </div>

      {/* Row 1: KPI cards */}
      <div className="mt-space-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.slice(0, 3).map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            trendDelta={card.trendDelta}
            {...(card.unit ? { unit: card.unit } : {})}
          />
        ))}
      </div>

      {/* Row 2: Area chart */}
      <div className="mt-space-6 rounded-xl border border-line bg-surface p-space-6">
        <div className="flex items-center justify-between mb-space-5">
          <div>
            <h2 className="text-h3 font-semibold text-default">Job activity</h2>
            <p className="text-small text-muted mt-space-1">Last 30 days</p>
          </div>
        </div>
        <DashboardAreaChart data={chartPoints} />
      </div>

      {/* Row 3: Bottom cards */}
      <div className="mt-space-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Properties */}
        <div className="rounded-xl border border-line bg-surface p-space-6">
          <h2 className="text-h3 font-semibold text-default">Top properties</h2>
          <p className="text-small text-muted mt-space-1">By job volume</p>
          <div className="mt-space-5">
            <PropertyBarChart data={propertyBars} />
          </div>
        </div>

        {/* Workers */}
        <div className="rounded-xl border border-line bg-surface p-space-6">
          <h2 className="text-h3 font-semibold text-default">Workers, last 7 days</h2>
          <div className="mt-space-5">
            <WorkerSparklines data={workerSparklines} />
          </div>
        </div>
      </div>
    </div>
  );
}
