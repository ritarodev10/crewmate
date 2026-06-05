'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  MapPin,
  Users,
  Building2,
  TrendingUp,
  Receipt,
  CreditCard,
  BarChart3,
  LineChart,
  Plug,
  Settings,
  ScrollText,
  LogOut,
} from 'lucide-react'
import { cn } from '@web/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@web/components/ui/avatar'
import { Button } from '@web/components/ui/button'
import { logoutAction } from '@web/app/(auth)/actions'
import type { Session } from '@web/lib/session'
import type { UserRole } from '@web/stores/auth'

interface SidebarProps {
  session: Session | null
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

interface NavGroup {
  heading: string
  items: NavItem[]
  roles?: UserRole[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'OPERATIONS',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Jobs', href: '/jobs', icon: ClipboardList },
      { label: 'Schedule', href: '/schedule', icon: CalendarDays, soon: true },
      { label: 'Dispatch', href: '/dispatch', icon: MapPin, soon: true },
    ],
  },
  {
    heading: 'WORKFORCE',
    items: [
      { label: 'Workforce', href: '/workforce', icon: Users },
      { label: 'Customers', href: '/customers', icon: Building2, soon: true },
    ],
  },
  {
    heading: 'FINANCE',
    items: [
      { label: 'Revenue', href: '/revenue', icon: TrendingUp },
      { label: 'Invoices', href: '/invoices', icon: Receipt, soon: true },
      { label: 'Payroll', href: '/payroll', icon: CreditCard, soon: true },
    ],
  },
  {
    heading: 'INSIGHTS',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, soon: true },
      { label: 'Performance', href: '/performance', icon: LineChart, soon: true },
    ],
  },
  {
    heading: 'SYSTEM',
    items: [
      { label: 'Integrations', href: '/integrations', icon: Plug, soon: true },
      { label: 'Settings', href: '/settings', icon: Settings, soon: true },
      { label: 'Audit Log', href: '/audit', icon: ScrollText, soon: true },
    ],
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    TEAM_LEAD: 'Team Lead',
    WORKER: 'Worker',
  }
  return map[role]
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()

  const visibleGroups = NAV_GROUPS.filter(group => {
    if (!group.roles) return true
    if (!session) return false
    return group.roles.includes(session.role)
  })

  // TEAM_LEAD sees OPERATIONS + WORKFORCE + FINANCE only
  const filteredGroups = session?.role === 'TEAM_LEAD'
    ? visibleGroups.filter(g => ['OPERATIONS', 'WORKFORCE', 'FINANCE'].includes(g.heading))
    : visibleGroups

  return (
    <aside className="flex w-60 min-h-screen flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-5">
        <span className="text-lg font-bold tracking-tight text-white">
          Crew<span className="text-brand">Mate</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredGroups.map((group, groupIdx) => (
          <div key={group.heading}>
            {groupIdx > 0 && group.heading === 'SYSTEM' && (
              <div className="my-3 border-t border-white/10" />
            )}
            <p className="mb-1 mt-4 px-2 text-[10px] font-semibold tracking-widest text-muted/60 uppercase">
              {group.heading}
            </p>
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)

              if (item.soon) {
                return (
                  <div
                    key={item.href}
                    className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted/40 select-none"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted/50">
                      Soon
                    </span>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-l-2 border-brand bg-brand/10 pl-[calc(0.5rem-2px)] font-semibold text-brand'
                      : 'text-muted hover:bg-surface/10 hover:text-white'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User pod */}
      {session && (
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar size="default">
              {session.avatarUrl && (
                <AvatarImage src={session.avatarUrl} alt={session.name} />
              )}
              <AvatarFallback className="bg-brand/20 text-brand text-xs">
                {getInitials(session.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white leading-tight">
                {session.name}
              </p>
              <p className="text-xs text-muted leading-tight">
                {roleLabel(session.role)}
              </p>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted hover:text-danger hover:bg-danger/10"
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
