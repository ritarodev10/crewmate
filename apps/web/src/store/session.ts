import { create } from 'zustand';

interface SessionState {
  userId: string | null;
  role: 'tenant_admin' | 'coordinator' | 'worker' | null;
  operatorId: string | null;
  name: string | null;
  setSession: (s: Pick<SessionState, 'userId' | 'role' | 'operatorId' | 'name'>) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  userId: null,
  role: null,
  operatorId: null,
  name: null,
  setSession: (s) => set(s),
  clearSession: () => set({ userId: null, role: null, operatorId: null, name: null }),
}));
