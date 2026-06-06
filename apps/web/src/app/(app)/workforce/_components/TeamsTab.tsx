'use client'

import { useState } from 'react'
import { Users, Briefcase } from 'lucide-react'
import { TeamDetailDrawer } from './TeamDetailDrawer'
import type { TeamWithStats } from './types'

interface TeamsTabProps {
  teams: TeamWithStats[]
}

function TeamCard({
  teamStats,
  onClick,
}: {
  teamStats: TeamWithStats
  onClick: () => void
}) {
  const { team, memberCount, todayJobCount, todayEarnings } = teamStats

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-left transition-all hover:border-[var(--color-brand)]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/50"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/10">
          <Users className="h-5 w-5 text-[var(--color-brand)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-default)]">{team.name}</p>
          <p className="text-xs text-[var(--color-muted)]">Phase 2 — Read-only view</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--color-line)] rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center py-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-default)]">
            <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            {memberCount}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">members</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-default)]">
            <Briefcase className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            {todayJobCount}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">jobs today</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="text-sm font-semibold text-[var(--color-default)]">
            €{todayEarnings}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">earned</span>
        </div>
      </div>
    </button>
  )
}

export function TeamsTab({ teams }: TeamsTabProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamWithStats | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleTeamClick(ts: TeamWithStats) {
    setSelectedTeam(ts)
    setDrawerOpen(true)
  }

  if (teams.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">No teams found.</p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((ts) => (
          <TeamCard key={ts.team.id} teamStats={ts} onClick={() => handleTeamClick(ts)} />
        ))}
      </div>

      <TeamDetailDrawer
        teamStats={selectedTeam}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}
