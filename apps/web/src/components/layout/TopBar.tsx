'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search, Plus, X } from 'lucide-react'
import { cn } from '@web/lib/utils'
import { Button } from '@web/components/ui/button'
import type { Session } from '@web/lib/session'

interface TopBarProps {
  session: Session | null
}

interface RouteMetadata {
  title: string
  subtitle: string | null
}

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  let greeting: string
  if (hour >= 5 && hour <= 11) greeting = 'Good morning'
  else if (hour >= 12 && hour <= 17) greeting = 'Good afternoon'
  else greeting = 'Good evening'
  return `${greeting}, ${firstName}.`
}

function useRouteMeta(pathname: string, session: Session | null): RouteMetadata {
  if (pathname.startsWith('/dashboard')) {
    const firstName = session?.name.split(' ')[0] ?? 'there'
    return { title: 'Dashboard', subtitle: getGreeting(firstName) }
  }
  if (pathname.startsWith('/jobs')) {
    return { title: 'Jobs', subtitle: 'All jobs across your operation.' }
  }
  if (pathname.startsWith('/workforce')) {
    return { title: 'Workforce', subtitle: 'Your field team.' }
  }
  if (pathname.startsWith('/revenue')) {
    return { title: 'Revenue', subtitle: 'Earnings and margin overview.' }
  }
  return { title: '', subtitle: null }
}

// Filter pills shown in the search dropdown
const SEARCH_SCOPES = ['Jobs', 'Workers', 'Customers'] as const
type SearchScope = (typeof SEARCH_SCOPES)[number]

export function TopBar({ session }: TopBarProps) {
  const pathname = usePathname()
  const { title, subtitle } = useRouteMeta(pathname, session)

  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeScopes, setActiveScopes] = useState<Set<SearchScope>>(
    new Set(SEARCH_SCOPES)
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
        setFocused(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleScope(scope: SearchScope) {
    setActiveScopes(prev => {
      const next = new Set(prev)
      if (next.has(scope)) {
        // Always keep at least one active
        if (next.size > 1) next.delete(scope)
      } else {
        next.add(scope)
      }
      return next
    })
  }

  const showDropdown = focused

  const canCreateJob =
    session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER'

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-canvas/95 px-6 backdrop-blur-sm">
      {/* Left: title + subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-default leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Center: search */}
      <div ref={containerRef} className="relative w-64">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-surface px-3 py-1.5 transition-colors',
            focused ? 'border-brand ring-2 ring-brand/20' : 'border-line'
          )}
        >
          <Search className="size-3.5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search…"
            className="flex-1 bg-transparent text-sm text-default placeholder:text-muted outline-none"
            onFocus={() => setFocused(true)}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted hover:text-default"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
          {!query && !focused && (
            <kbd className="hidden rounded border border-line bg-canvas px-1 py-0.5 text-[10px] text-muted sm:block">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Scope pills */}
        {focused && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted">In:</span>
            {SEARCH_SCOPES.map(scope => (
              <button
                key={scope}
                onClick={() => toggleScope(scope)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                  activeScopes.has(scope)
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-dashed border-line text-muted hover:border-brand/50 hover:text-brand/70'
                )}
              >
                {scope}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 top-full mt-7 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
            {SEARCH_SCOPES.filter(s => activeScopes.has(s)).map(scope => (
              <div key={scope}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {scope}
                </p>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="mx-3 mb-2 h-7 animate-pulse rounded-md bg-canvas"
                  />
                ))}
              </div>
            ))}
            <div className="border-t border-line px-3 py-2 text-center text-[11px] text-muted">
              Start typing to search…
            </div>
          </div>
        )}
      </div>

      {/* Right: new job button */}
      {canCreateJob && (
        <Button size="sm" variant="default" className="shrink-0 gap-1.5">
          <Plus className="size-3.5" />
          New Job
        </Button>
      )}
    </header>
  )
}
