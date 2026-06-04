import {
  FIXTURE_KPI_CARDS,
  FIXTURE_CHART_POINTS,
  FIXTURE_PROPERTY_BARS,
  FIXTURE_WORKER_SPARKLINES,
} from '@/lib/fixtures';

export function useDashboard() {
  return {
    kpiCards: FIXTURE_KPI_CARDS,
    chartPoints: FIXTURE_CHART_POINTS,
    propertyBars: FIXTURE_PROPERTY_BARS,
    workerSparklines: FIXTURE_WORKER_SPARKLINES,
    isLoading: false,
  };
}
