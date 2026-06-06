'use client'

import { useQueryClient } from '@tanstack/react-query'
import { KpiCards } from '@web/components/dashboard/KpiCards'
import { ActivityFeed } from '@web/components/dashboard/ActivityFeed'
import { JobMapClient } from './JobMapClient'
import { useSocket } from '@web/hooks/use-socket'
import {
  useDashboardSummary,
  useDashboardActivity,
  useDashboardJobs,
} from '../_hooks/use-dashboard'
import type { Session } from '@web/lib/session'

interface DashboardClientProps {
  token: string | undefined
  session: Session | null
}

export function DashboardClient({ token, session }: DashboardClientProps) {
  const queryClient = useQueryClient()

  const { data: summary } = useDashboardSummary()
  const { data: activity, isLoading: activityLoading } = useDashboardActivity()
  const { data: jobs = [] } = useDashboardJobs()

  useSocket(token, (event) => {
    if (
      event === 'job.status.changed' ||
      event === 'job.progress.updated' ||
      event === 'job.cancelled'
    ) {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] })
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } else if (event === 'worker.status.changed') {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    }
  })

  return (
    <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">
      <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col overflow-y-auto border-r border-line shrink-0">
        <div className="p-6 space-y-6">
          <KpiCards summary={summary ?? null} session={session} />
        </div>
        <div className="flex-1 px-6 pb-6">
          <ActivityFeed events={activity ?? []} loading={activityLoading} />
        </div>
      </div>
      <div className="flex-1 relative min-h-[400px] lg:min-h-0">
        <JobMapClient jobs={jobs ?? []} session={session} />
      </div>
    </main>
  )
}
