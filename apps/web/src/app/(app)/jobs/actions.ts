'use server'

import { apiFetch } from '@web/lib/api'
import type { Job, CancelCode } from '@web/types/api'

export async function fetchJobDetailAction(token: string, jobId: string): Promise<Job | null> {
  try {
    const res = await apiFetch<{ data: Job }>(`/jobs/${jobId}`, { token })
    return res.data
  } catch {
    return null
  }
}

interface CreateJobPayload {
  customerId: string
  jobTypeId: string
  assigneeKind: 'SOLO' | 'TEAM'
  workerId: string | null
  teamId: string | null
  scheduledFor: string
  estimatedHours: number
}

export async function createJobAction(
  token: string,
  payload: CreateJobPayload,
): Promise<{ data: Job } | { error: string }> {
  try {
    return await apiFetch<{ data: Job }>('/jobs', { method: 'POST', token, body: payload })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create job' }
  }
}

interface CancelJobPayload {
  cancelReasonCode: CancelCode
  cancelReasonNote?: string
}

export async function cancelJobAction(
  token: string,
  jobId: string,
  payload: CancelJobPayload,
): Promise<{ data: Job } | { error: string }> {
  try {
    return await apiFetch<{ data: Job }>(`/jobs/${jobId}/cancel`, {
      method: 'PATCH',
      token,
      body: payload,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to cancel job' }
  }
}
