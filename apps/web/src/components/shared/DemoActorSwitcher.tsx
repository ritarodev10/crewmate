'use client'

import { useEffect, useRef, useState } from 'react'
import { User, ChevronDown, ChevronUp, RefreshCw, Check } from 'lucide-react'
import { cn } from '@web/lib/utils'
import type { Session } from '@web/lib/session'
import type { UserRole } from '@web/stores/auth'

interface Actor {
  userId: string
  name: string
  role: UserRole
  email: string
  operatorId: string
  teamId?: string
  workerId?: string
  group?: string
}

const ACTORS: Actor[] = [
  { userId: 'u-01', name: 'Admin System', role: 'SUPER_ADMIN', email: 'admin@crewmate.demo', operatorId: 'op-001' },
  { userId: 'u-02', name: 'Marco Bianchi', role: 'MANAGER', email: 'marco.b@crewmate.demo', operatorId: 'op-001' },
  { userId: 'u-03', name: 'Luca Ferrari', role: 'TEAM_LEAD', email: 'luca.f@crewmate.demo', operatorId: 'op-001', teamId: 'tm-01' },
  { userId: 'u-04', name: 'Sofia Conti', role: 'WORKER', email: 'sofia.c@crewmate.demo', operatorId: 'op-001', workerId: 'w-02', group: 'Team Alfa' },
  { userId: 'u-05', name: 'Davide Russo', role: 'WORKER', email: 'davide.r@crewmate.demo', operatorId: 'op-001', workerId: 'w-03', group: 'Team Alfa' },
  { userId: 'u-06', name: 'Elena Moretti', role: 'WORKER', email: 'elena.m@crewmate.demo', operatorId: 'op-001', workerId: 'w-04', group: 'Team Alfa' },
  { userId: 'u-07', name: 'Antonio Ricci', role: 'WORKER', email: 'antonio.r@crewmate.demo', operatorId: 'op-001', workerId: 'w-05', group: 'Solo' },
  { userId: 'u-08', name: 'Giulia Romano', role: 'WORKER', email: 'giulia.ro@crewmate.demo', operatorId: 'op-001', workerId: 'w-06', group: 'Solo' },
  { userId: 'u-09', name: 'Matteo Gallo', role: 'WORKER', email: 'matteo.g@crewmate.demo', operatorId: 'op-001', workerId: 'w-07', group: 'Solo' },
  { userId: 'u-10', name: 'Chiara Marino', role: 'WORKER', email: 'chiara.m@crewmate.demo', operatorId: 'op-001', workerId: 'w-08', group: 'Solo' },
  { userId: 'u-11', name: 'Roberto Costa', role: 'WORKER', email: 'roberto.c@crewmate.demo', operatorId: 'op-001', workerId: 'w-09', group: 'Solo' },
]

const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-500/15 text-purple-400',
  MANAGER: 'bg-brand/15 text-brand',
  TEAM_LEAD: 'bg-amber/15 text-amber',
  WORKER: 'bg-success/15 text-success',
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  TEAM_LEAD: 'Team Lead',
  WORKER: 'Worker',
}

function parseCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
  if (!match) return null
  try {
    return decodeURIComponent(match.split('=').slice(1).join('='))
  } catch {
    return null
  }
}

function readCurrentSession(): Session | null {
  const demoActorRaw = parseCookieValue('demo_actor')
  const sessionRaw = parseCookieValue('crewmate_session')
  try {
    if (demoActorRaw) return JSON.parse(demoActorRaw) as Session
    if (sessionRaw) return JSON.parse(sessionRaw) as Session
  } catch {
    return null
  }
  return null
}

function switchActor(actor: Actor) {
  const session: Session = {
    userId: actor.userId,
    name: actor.name,
    role: actor.role,
    operatorId: actor.operatorId,
    ...(actor.teamId ? { teamId: actor.teamId } : {}),
    ...(actor.workerId ? { workerId: actor.workerId } : {}),
  }
  const json = encodeURIComponent(JSON.stringify(session))
  document.cookie = `demo_actor=${json}; path=/; max-age=86400; samesite=lax`
  const redirect = actor.role === 'WORKER' ? '/worker' : '/dashboard'
  window.location.href = redirect
}

// Group actors for rendering
const LEAD_ACTORS = ACTORS.filter(a => !a.group)
const TEAM_ALFA = ACTORS.filter(a => a.group === 'Team Alfa')
const SOLO_ACTORS = ACTORS.filter(a => a.group === 'Solo')

export function DemoActorSwitcher() {
  const [open, setOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentSession(readCurrentSession())
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleReset() {
    setResetting(true)
    try {
      await fetch('/api/demo/reset', { method: 'POST' })
    } catch {
      // stub — ignore errors
    }
    setResetting(false)
    setResetDone(true)
    setTimeout(() => {
      setResetDone(false)
      window.location.reload()
    }, 2000)
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  const displayName = currentSession?.name ?? 'No actor'
  const displayRole = currentSession?.role

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-[9999]">
      {/* Dropdown — opens upward */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-[280px] max-h-[480px] overflow-y-auto rounded-xl border border-line bg-canvas shadow-xl">
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wider">
            Switch Actor
          </p>

          {/* Lead actors */}
          {LEAD_ACTORS.map(actor => (
            <ActorRow
              key={actor.userId}
              actor={actor}
              isCurrent={actor.userId === currentSession?.userId}
              onSelect={switchActor}
            />
          ))}

          {/* Team Alfa */}
          <div className="mx-3 my-1 border-t border-line" />
          <p className="px-3 py-1 text-[10px] text-muted">Team Alfa</p>
          {TEAM_ALFA.map(actor => (
            <ActorRow
              key={actor.userId}
              actor={actor}
              isCurrent={actor.userId === currentSession?.userId}
              onSelect={switchActor}
            />
          ))}

          {/* Solo workers */}
          <div className="mx-3 my-1 border-t border-line" />
          <p className="px-3 py-1 text-[10px] text-muted">Solo</p>
          {SOLO_ACTORS.map(actor => (
            <ActorRow
              key={actor.userId}
              actor={actor}
              isCurrent={actor.userId === currentSession?.userId}
              onSelect={switchActor}
            />
          ))}

          {/* Reset button */}
          <div className="mx-3 my-1 border-t border-line" />
          <button
            onClick={handleReset}
            disabled={resetting || resetDone}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors',
              resetDone
                ? 'text-success'
                : 'text-muted hover:text-danger hover:bg-danger/5',
              (resetting || resetDone) && 'cursor-not-allowed'
            )}
          >
            <RefreshCw
              className={cn('size-3.5 shrink-0', resetting && 'animate-spin')}
            />
            {resetDone ? 'Reset complete' : resetting ? 'Resetting…' : 'Reset Demo Data'}
          </button>
        </div>
      )}

      {/* Collapsed chip */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-2 shadow-lg transition-colors hover:bg-surface"
      >
        <User className="size-3.5 text-muted" />
        <span className="text-sm font-medium text-default">{displayName}</span>
        {displayRole && (
          <>
            <span className="text-muted">—</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                ROLE_BADGE[displayRole]
              )}
            >
              {ROLE_LABEL[displayRole]}
            </span>
          </>
        )}
        {open ? (
          <ChevronUp className="size-3.5 text-muted" />
        ) : (
          <ChevronDown className="size-3.5 text-muted" />
        )}
      </button>
    </div>
  )
}

interface ActorRowProps {
  actor: Actor
  isCurrent: boolean
  onSelect: (actor: Actor) => void
}

function ActorRow({ actor, isCurrent, onSelect }: ActorRowProps) {
  return (
    <button
      onClick={() => onSelect(actor)}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface/60',
        isCurrent && 'bg-brand/5'
      )}
    >
      <span className="flex-1 text-left font-medium text-default truncate">
        {actor.name}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
          ROLE_BADGE[actor.role]
        )}
      >
        {ROLE_LABEL[actor.role]}
      </span>
      {isCurrent && <Check className="size-3 shrink-0 text-brand" />}
    </button>
  )
}
