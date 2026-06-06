'use client'

import { useQuery } from '@tanstack/react-query'
import { browserFetch } from '@web/lib/browser-api'
import type { RevenueSummary } from '@web/types/api'

export function useRevenue() {
  return useQuery<RevenueSummary>({
    queryKey: ['revenue'],
    queryFn: () =>
      browserFetch<{ data: RevenueSummary }>('/revenue').then((r) => r.data),
    staleTime: 30 * 1000,
  })
}
