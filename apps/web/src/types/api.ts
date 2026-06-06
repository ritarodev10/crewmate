// Mirror of prisma/schema.prisma — keep in sync manually.
// API responses are shaped as { data: T } — unwrap on the client.

export type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkerStatus = 'IDLE' | 'ON_JOB' | 'OFF_DUTY'
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'WORKER'
export type WorkerKind = 'SOLO' | 'TEAM_MEMBER' | 'TEAM_LEAD'
export type AssigneeKind = 'SOLO' | 'TEAM'
export type CancelCode =
  | 'CUSTOMER_CANCELLED'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'WORKER_NO_SHOW'
  | 'ACCESS_DENIED'
  | 'DUPLICATE_JOB'
  | 'EMERGENCY_RECALL'

export interface Operator {
  id: string
  name: string
  slug: string
  createdAt: string
}

export interface User {
  id: string
  operatorId: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  worker?: Worker | null
}

export interface Worker {
  id: string
  operatorId: string
  userId: string
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  hourlyRate: number
  status: WorkerStatus
  kind: WorkerKind
  rating: number
  currentLat?: number | null
  currentLng?: number | null
  createdAt: string
}

export interface Team {
  id: string
  operatorId: string
  name: string
  leadId?: string | null
  createdAt: string
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  teamId: string
  workerId: string
  worker?: Worker
  joinedAt: string
}

export interface Customer {
  id: string
  operatorId: string
  name: string
  address: string
  lat: number
  lng: number
  phone?: string | null
  email?: string | null
  contactName?: string | null
  createdAt: string
}

export interface JobType {
  id: string
  operatorId: string
  name: string
  label: string
  estimatedHours: number
  clientRatePerHour: number
  customerPhotos: string[]
  workerPhotos: string[]
  createdAt: string
}

export interface Job {
  id: string
  operatorId: string
  customerId: string
  customer?: Customer
  jobTypeId: string
  jobType?: JobType
  assigneeKind: AssigneeKind
  workerId?: string | null
  worker?: Worker | null
  teamId?: string | null
  team?: Team | null
  status: JobStatus
  progressPct: number
  scheduledFor: string
  startedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReasonCode?: CancelCode | null
  cancelReasonNote?: string | null
  estimatedHours: number
  clientRatePerHour: number
  customerPhotoUrls: string[]
  workerPhotoUrls: string[]
  lat: number
  lng: number
  customerRating?: number | null
  customerTestimony?: string | null
  notes?: string | null
  createdAt: string
  statusEvents?: JobStatusEvent[]
}

export interface JobStatusEvent {
  id: string
  jobId: string
  actorUserId: string
  fromStatus?: JobStatus | null
  toStatus: JobStatus
  note?: string | null
  metadata?: Record<string, unknown> | null
  occurredAt: string
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
}

// Dashboard types
export interface DashboardSummaryData {
  totalJobs: number
  completedJobs: number
  inProgressJobs: number
  scheduledJobs: number
  cancelledJobs: number
  activeWorkers: number
  todayRevenue: number  // cents
  todayProfit: number   // cents
}

export interface ActivityEvent {
  id: string
  jobId: string
  jobTypeLabel: string
  workerName: string | null
  fromStatus: string | null
  toStatus: string
  note: string | null
  occurredAt: string
}
