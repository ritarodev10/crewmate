'use client'

import { useState } from 'react'
import { Search, Users, Zap, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@web/components/ui/tabs'
import { WorkerCard } from './WorkerCard'
import { WorkerDetailDrawer } from './WorkerDetailDrawer'
import { TeamsTab } from './TeamsTab'
import type { WorkerWithStats, TeamWithStats } from './types'
import type { Session } from '@web/lib/session'

interface WorkforceViewProps {
  workers: WorkerWithStats[]
  teams: TeamWithStats[]
  session: Session | null
}

interface KpiMiniCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
}

function KpiMiniCard({ icon, label, value }: KpiMiniCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold leading-none text-[var(--color-default)]">{value}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
      </div>
    </div>
  )
}

export function WorkforceView({ workers, teams, session }: WorkforceViewProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('workers')
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithStats | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // KPI counts
  const totalWorkers = workers.length
  const onJobNow = workers.filter((w) => w.liveStatus === 'ON_JOB').length
  const available = workers.filter((w) => w.liveStatus === 'IDLE').length

  // Filter by search
  const filtered = search.trim()
    ? workers.filter((ws) =>
        ws.worker.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : workers

  // For TEAM_LEAD: show "My Team" label (w-01..w-04)
  const isTeamLead = session?.role === 'TEAM_LEAD'

  function handleWorkerClick(ws: WorkerWithStats) {
    setSelectedWorker(ws)
    setDrawerOpen(true)
  }

  // Determine if the selected worker is the logged-in team lead
  const isViewingOwnDrawer =
    isTeamLead &&
    selectedWorker !== null &&
    session?.workerId === selectedWorker.worker.id

  // Compute team summary for own drawer
  const myTeamStats = isTeamLead
    ? teams.find((t) => t.team.leadId === session?.workerId)
    : undefined

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="default" className="self-start">
            <TabsTrigger value="workers">Workers</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {/* Search — only on workers tab */}
          {activeTab === 'workers' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workers…"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pl-9 pr-3 text-sm text-[var(--color-default)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Workers Tab */}
        <TabsContent value="workers" className="mt-4 space-y-5">
          {/* KPI mini-cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiMiniCard
              icon={<Users className="h-4 w-4" />}
              label="Total Workers"
              value={totalWorkers}
            />
            <KpiMiniCard
              icon={<Zap className="h-4 w-4" />}
              label="On Job Now"
              value={onJobNow}
            />
            <KpiMiniCard
              icon={<Clock className="h-4 w-4" />}
              label="Available"
              value={available}
            />
          </div>

          {/* My Team label for TEAM_LEAD */}
          {isTeamLead && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-brand)]">
                My Team
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                Showing Team Alfa members only
              </span>
            </div>
          )}

          {/* Worker grid */}
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No workers match &quot;{search}&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((ws) => (
                <WorkerCard
                  key={ws.worker.id}
                  workerStats={ws}
                  onClick={() => handleWorkerClick(ws)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-4">
          <TeamsTab teams={teams} />
        </TabsContent>
      </Tabs>

      {/* Worker Detail Drawer */}
      <WorkerDetailDrawer
        workerStats={selectedWorker}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        isTeamLead={isViewingOwnDrawer}
        teamSummary={
          isViewingOwnDrawer && myTeamStats
            ? {
                memberCount: myTeamStats.memberCount,
                todayJobCount: myTeamStats.todayJobCount,
                todayEarnings: myTeamStats.todayEarnings,
              }
            : undefined
        }
      />
    </div>
  )
}
