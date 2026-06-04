/**
 * Fixture KPI metrics for the dashboard.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type KpiTrend = 'up' | 'down' | 'flat';
export type KpiUnit = 'jobs' | '%' | 'min' | 'hrs';

export type KpiCard = {
  label: string;
  value: string | number;
  unit: KpiUnit | null;
  trend: KpiTrend;
  trendDelta: string; // e.g. '+12%', '-3m', 'flat'
};

export type ChartPoint = {
  date: string;      // YYYY-MM-DD
  completed: number;
  scheduled: number;
};

export type PropertyBar = {
  propertyId: string;
  propertyName: string;
  jobCount: number;
  onTimeRate: number; // 0–1
};

export type WorkerSparkline = {
  workerId: string;
  workerName: string;
  points: [number, number, number, number, number, number, number]; // 7 daily values
};

// ── KPI Cards (3 primary + 1 secondary) ──────────────────────────────────────
export const FIXTURE_KPI_CARDS: KpiCard[] = [
  {
    label: 'Jobs completed',
    value: 142,
    unit: 'jobs',
    trend: 'up',
    trendDelta: '+12%',
  },
  {
    label: 'On-time completion',
    value: 94.2,
    unit: '%',
    trend: 'up',
    trendDelta: '+2.1%',
  },
  {
    label: 'Avg job duration',
    value: 38,
    unit: 'min',
    trend: 'down',
    trendDelta: '-4m',
  },
  {
    label: 'Active workers',
    value: 38,
    unit: null,
    trend: 'flat',
    trendDelta: 'flat',
  },
];

// ── Chart points (28 days — 4 full weeks) ────────────────────────────────────
export const FIXTURE_CHART_POINTS: ChartPoint[] = [
  { date: '2026-05-08', completed: 28, scheduled: 31 },
  { date: '2026-05-09', completed: 14, scheduled: 14 },
  { date: '2026-05-10', completed: 6, scheduled: 6 },
  { date: '2026-05-11', completed: 32, scheduled: 34 },
  { date: '2026-05-12', completed: 29, scheduled: 30 },
  { date: '2026-05-13', completed: 25, scheduled: 28 },
  { date: '2026-05-14', completed: 18, scheduled: 20 },
  { date: '2026-05-15', completed: 31, scheduled: 33 },
  { date: '2026-05-16', completed: 12, scheduled: 12 },
  { date: '2026-05-17', completed: 5, scheduled: 5 },
  { date: '2026-05-18', completed: 34, scheduled: 36 },
  { date: '2026-05-19', completed: 30, scheduled: 32 },
  { date: '2026-05-20', completed: 27, scheduled: 29 },
  { date: '2026-05-21', completed: 19, scheduled: 22 },
  { date: '2026-05-22', completed: 33, scheduled: 35 },
  { date: '2026-05-23', completed: 13, scheduled: 13 },
  { date: '2026-05-24', completed: 4, scheduled: 4 },
  { date: '2026-05-25', completed: 36, scheduled: 38 },
  { date: '2026-05-26', completed: 31, scheduled: 33 },
  { date: '2026-05-27', completed: 28, scheduled: 30 },
  { date: '2026-05-28', completed: 21, scheduled: 23 },
  { date: '2026-05-29', completed: 35, scheduled: 37 },
  { date: '2026-05-30', completed: 11, scheduled: 11 },
  { date: '2026-05-31', completed: 3, scheduled: 3 },
  { date: '2026-06-01', completed: 38, scheduled: 40 },
  { date: '2026-06-02', completed: 33, scheduled: 35 },
  { date: '2026-06-03', completed: 29, scheduled: 31 },
  { date: '2026-06-04', completed: 14, scheduled: 22 }, // current day, still in progress
];

// ── Property bars (4 properties + aggregate) ─────────────────────────────────
export const FIXTURE_PROPERTY_BARS: PropertyBar[] = [
  {
    propertyId: 'prop-001',
    propertyName: 'Brookline Heights',
    jobCount: 42,
    onTimeRate: 0.95,
  },
  {
    propertyId: 'prop-002',
    propertyName: 'Harborview Residences',
    jobCount: 31,
    onTimeRate: 0.97,
  },
  {
    propertyId: 'prop-003',
    propertyName: 'The Aldgate',
    jobCount: 28,
    onTimeRate: 0.89,
  },
  {
    propertyId: 'prop-005',
    propertyName: 'Northgate Commercial',
    jobCount: 24,
    onTimeRate: 0.92,
  },
];

// ── Worker sparklines (7 daily job-completion values each) ───────────────────
export const FIXTURE_WORKER_SPARKLINES: WorkerSparkline[] = [
  {
    workerId: 'worker-001',
    workerName: 'Marcus Webb',
    points: [6, 7, 5, 8, 6, 3, 0],
  },
  {
    workerId: 'worker-002',
    workerName: 'Priya Nair',
    points: [5, 6, 7, 5, 8, 2, 0],
  },
  {
    workerId: 'worker-003',
    workerName: 'Olu Adeleke',
    points: [7, 5, 6, 7, 5, 4, 1],
  },
  {
    workerId: 'worker-004',
    workerName: 'Sofia Larsson',
    points: [4, 6, 5, 6, 7, 3, 0],
  },
];
