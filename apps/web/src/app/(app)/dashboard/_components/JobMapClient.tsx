'use client'

import dynamic from 'next/dynamic'
import type { Job } from '@web/types/api'
import type { Session } from '@web/lib/session'

const JobMap = dynamic(
  () => import('@web/components/dashboard/JobMap').then((m) => ({ default: m.JobMap })),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface/50 animate-pulse" />,
  }
)

interface JobMapClientProps {
  jobs: Job[]
  session: Session | null
}

export function JobMapClient({ jobs, session }: JobMapClientProps) {
  return <JobMap jobs={jobs} session={session} />
}
