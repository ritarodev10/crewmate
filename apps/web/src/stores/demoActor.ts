'use client'

import { create } from 'zustand'
import type { SessionUser } from './auth'

interface DemoActorState {
  isOpen: boolean
  currentActor: SessionUser | null
  setOpen: (open: boolean) => void
  setActor: (actor: SessionUser) => void
}

export const useDemoActorStore = create<DemoActorState>((set) => ({
  isOpen: false,
  currentActor: null,
  setOpen: (open) => set({ isOpen: open }),
  setActor: (actor) => set({ currentActor: actor, isOpen: false }),
}))
