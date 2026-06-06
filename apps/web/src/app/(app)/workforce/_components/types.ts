import type { Worker, Job, Team } from '@web/types/api'

export type LiveStatus = 'ON_JOB' | 'IDLE' | 'OFF_DUTY'

export interface WorkerWithStats {
  worker: Worker
  liveStatus: LiveStatus
  todayJobs: Job[]
  todayJobCount: number
  todayEarnings: number  // euros (integer)
}

export interface TeamWithStats {
  team: Team
  memberCount: number
  todayJobCount: number
  todayEarnings: number  // euros (integer)
  memberStats: WorkerWithStats[]
}
