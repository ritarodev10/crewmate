'use client'

import { useQuery } from '@tanstack/react-query'
import { browserFetch } from '@web/lib/browser-api'
import type { Job, Worker } from '@web/types/api'

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: () =>
      browserFetch<{ data: Job[] }>('/jobs').then((r) => r.data),
    staleTime: 30 * 1000,
  })
}

export function useWorkers() {
  return useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () =>
      browserFetch<{ data: Worker[] }>('/workers').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
}
