'use client'

import { create } from 'zustand'

export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'WORKER'

export interface SessionUser {
  userId: string
  name: string
  role: UserRole
  operatorId: string
  avatarUrl?: string
  teamId?: string
  workerId?: string
}

interface AuthState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
