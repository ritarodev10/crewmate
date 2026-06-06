import { cn } from '@web/lib/utils'

interface BreakdownRow {
  jobType: string
  jobsCompleted: number
  totalRevenue: number // euros (not cents)
  totalProfit: number  // euros (not cents)
  marginPct: number
}

const BREAKDOWN_ROWS: BreakdownRow[] = [
  { jobType: 'AC Installation',    jobsCompleted: 2, totalRevenue: 1600, totalProfit: 484,  marginPct: 30.3 },
  { jobType: 'Electrical Panel',   jobsCompleted: 2, totalRevenue: 595,  totalProfit: 225,  marginPct: 37.8 },
  { jobType: 'HVAC Repair',        jobsCompleted: 2, totalRevenue: 432,  totalProfit: 192,  marginPct: 44.4 },
  { jobType: 'Generator Repair',   jobsCompleted: 1, totalRevenue: 414,  totalProfit: 130,  marginPct: 31.5 },
  { jobType: 'Pipe Repair',        jobsCompleted: 2, totalRevenue: 340,  totalProfit: 140,  marginPct: 41.2 },
  { jobType: 'Lighting Install',   jobsCompleted: 2, totalRevenue: 248,  totalProfit: 116,  marginPct: 46.8 },
  { jobType: 'HVAC Maintenance',   jobsCompleted: 2, totalRevenue: 232,  totalProfit: 112,  marginPct: 48.3 },
  { jobType: 'Drain Cleaning',     jobsCompleted: 2, totalRevenue: 150,  totalProfit: 66,   marginPct: 44.0 },
]

function formatEuros(amount: number): string {
  if (amount === 0) return '€0.00'
  return new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace(/^/, '€')
}

export function RevenueBreakdownTable() {
  const totalJobs = BREAKDOWN_ROWS.reduce((acc, r) => acc + r.jobsCompleted, 0)
  const totalRevenue = BREAKDOWN_ROWS.reduce((acc, r) => acc + r.totalRevenue, 0)
  const totalProfit = BREAKDOWN_ROWS.reduce((acc, r) => acc + r.totalProfit, 0)
  const totalMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-sm font-semibold text-default">Revenue by Job Type</h2>
        <p className="text-xs text-muted mt-0.5">Breakdown of today&apos;s completed jobs</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Job Type
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                Jobs Completed
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-blue-700">
                Total Revenue
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-green-700">
                Total Profit
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                Margin
              </th>
            </tr>
          </thead>
          <tbody>
            {BREAKDOWN_ROWS.map((row, i) => (
              <tr
                key={row.jobType}
                className={cn(
                  'transition-colors hover:bg-blue-50/30',
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                )}
              >
                <td className="px-5 py-3 font-medium text-default whitespace-nowrap">
                  {row.totalRevenue === 0 ? (
                    <span className="text-muted">{row.jobType}</span>
                  ) : (
                    row.jobType
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-default">
                  {row.jobsCompleted}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-default">
                  {row.totalRevenue === 0 ? (
                    <span className="text-muted">€0.00</span>
                  ) : (
                    formatEuros(row.totalRevenue)
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-default">
                  {row.totalProfit === 0 ? (
                    <span className="text-muted">€0.00</span>
                  ) : (
                    formatEuros(row.totalProfit)
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-default">
                  {row.totalRevenue === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    `${row.marginPct.toFixed(1)}%`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-200 font-semibold">
              <td className="px-5 py-3 text-default">TOTAL</td>
              <td className="px-5 py-3 text-right tabular-nums text-default">{totalJobs}</td>
              <td className="px-5 py-3 text-right tabular-nums text-default">
                {formatEuros(totalRevenue)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-default">
                {formatEuros(totalProfit)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-default">
                {totalMarginPct.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
