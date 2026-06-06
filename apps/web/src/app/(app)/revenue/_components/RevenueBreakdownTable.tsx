import { Skeleton } from '@web/components/ui/skeleton'
import { cn } from '@web/lib/utils'
import type { RevenueByJobType } from '@web/types/api'

function formatEuros(cents: number): string {
  return new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100).replace(/^/, '€')
}

interface RevenueBreakdownTableProps {
  byJobType: RevenueByJobType[] | null
  isLoading: boolean
}

export function RevenueBreakdownTable({ byJobType, isLoading }: RevenueBreakdownTableProps) {
  const rows = byJobType ?? []
  const totalJobs = rows.reduce((acc, r) => acc + r.jobCount, 0)
  const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0)
  const totalProfit = rows.reduce((acc, r) => acc + r.profit, 0)
  const totalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-sm font-semibold text-default">Revenue by Job Type</h2>
        <p className="text-xs text-muted mt-0.5">Breakdown of today&apos;s completed jobs</p>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted">No completed jobs today.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Job Type</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Jobs</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-blue-700">Revenue</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-green-700">Profit</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const margin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={row.jobTypeId} className={cn('transition-colors hover:bg-blue-50/30', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    <td className="px-5 py-3 font-medium text-default whitespace-nowrap">{row.label}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-default">{row.jobCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-default">{formatEuros(row.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-default">{formatEuros(row.profit)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-default">{margin}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200 font-semibold">
                <td className="px-5 py-3 text-default">TOTAL</td>
                <td className="px-5 py-3 text-right tabular-nums text-default">{totalJobs}</td>
                <td className="px-5 py-3 text-right tabular-nums text-default">{formatEuros(totalRevenue)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-default">{formatEuros(totalProfit)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-default">{totalMargin}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
