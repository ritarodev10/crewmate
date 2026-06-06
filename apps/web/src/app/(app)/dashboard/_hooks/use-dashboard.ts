'use client'

import { useQuery } from '@tanstack/react-query'
import { browserFetch } from '@web/lib/browser-api'
import type { DashboardSummaryData, ActivityEvent, Job } from '@web/types/api'

export function useDashboardSummary() {
  return useQuery<DashboardSummaryData>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () =>
      browserFetch<{ data: DashboardSummaryData }>('/dashboard/summary').then((r) => r.data),
    staleTime: 30 * 1000,
  })
}

export function useDashboardActivity() {
  return useQuery<ActivityEvent[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () =>
      browserFetch<{ data: ActivityEvent[] }>('/dashboard/activity').then((r) => r.data),
    staleTime: 30 * 1000,
  })
}

export function useDashboardJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: () =>
      browserFetch<{ data: Job[] }>('/jobs').then((r) => r.data),
    staleTime: 30 * 1000,
  })
}
