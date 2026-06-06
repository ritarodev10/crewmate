import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import type { UserRole } from '@web/stores/auth'

export interface Session {
  userId: string
  name: string
  role: UserRole
  operatorId: string
  accessToken?: string  // JWT from real login — demo actor cookies won't have it
  avatarUrl?: string
  teamId?: string
  workerId?: string
}

export const FIXTURE_SESSIONS: Record<string, Session> = {
  'admin@crewmate.demo': {
    userId: 'u-01', name: 'Admin System', role: 'SUPER_ADMIN', operatorId: 'op-001',
  },
  'marco.b@crewmate.demo': {
    userId: 'u-02', name: 'Marco Bianchi', role: 'MANAGER', operatorId: 'op-001',
    avatarUrl: '/images/avatars/avatar-marco.jpg',
  },
  'luca.f@crewmate.demo': {
    userId: 'u-03', name: 'Luca Ferrari', role: 'TEAM_LEAD', operatorId: 'op-001',
    teamId: 'tm-01', avatarUrl: '/images/avatars/avatar-luca.jpg',
  },
  'sofia.c@crewmate.demo': {
    userId: 'u-04', name: 'Sofia Conti', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-02', avatarUrl: '/images/avatars/avatar-sofia.jpg',
  },
  'davide.r@crewmate.demo': {
    userId: 'u-05', name: 'Davide Russo', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-03', avatarUrl: '/images/avatars/avatar-davide.jpg',
  },
  'elena.m@crewmate.demo': {
    userId: 'u-06', name: 'Elena Moretti', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-04', avatarUrl: '/images/avatars/avatar-elena.jpg',
  },
  'antonio.r@crewmate.demo': {
    userId: 'u-07', name: 'Antonio Ricci', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-05', avatarUrl: '/images/avatars/avatar-antonio.jpg',
  },
  'giulia.ro@crewmate.demo': {
    userId: 'u-08', name: 'Giulia Romano', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-06', avatarUrl: '/images/avatars/avatar-giulia.jpg',
  },
  'matteo.g@crewmate.demo': {
    userId: 'u-09', name: 'Matteo Gallo', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-07', avatarUrl: '/images/avatars/avatar-matteo.jpg',
  },
  'chiara.m@crewmate.demo': {
    userId: 'u-10', name: 'Chiara Marino', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-08', avatarUrl: '/images/avatars/avatar-chiara.jpg',
  },
  'roberto.c@crewmate.demo': {
    userId: 'u-11', name: 'Roberto Costa', role: 'WORKER', operatorId: 'op-001',
    workerId: 'w-09', avatarUrl: '/images/avatars/avatar-roberto.jpg',
  },
}

export function roleToRedirect(role: UserRole): string {
  if (role === 'WORKER') return '/worker'
  return '/dashboard'
}

export const SESSION_COOKIE = 'crewmate_session'
export const DEMO_ACTOR_COOKIE = 'demo_actor'

export function getServerSession(cookieStore: ReadonlyRequestCookies): Session | null {
  // demo_actor takes priority over crewmate_session
  const demoRaw = cookieStore.get(DEMO_ACTOR_COOKIE)?.value
  if (demoRaw) {
    try { return JSON.parse(demoRaw) as Session } catch { /* fall through */ }
  }
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  if (sessionRaw) {
    try { return JSON.parse(sessionRaw) as Session } catch { /* fall through */ }
  }
  return null
}
