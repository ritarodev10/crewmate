'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Columns3,
  Calendar,
  Webhook,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SidebarNavItem } from './SidebarNavItem';
import { UserPod } from './UserPod';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dispatch', label: 'Dispatch', icon: Columns3 },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/settings/team', label: 'Settings', icon: Settings2 },
];

const COLLAPSED_KEY = 'crewmate_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const width = isCollapsed ? 'w-16' : 'w-[220px]';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-brand flex flex-col z-[10] transition-[width] duration-200',
        width,
      )}
    >
      {/* Wordmark */}
      <div className="flex items-center justify-between h-16 px-space-4 shrink-0">
        {!isCollapsed && (
          <span className="text-h2 text-on-brand font-semibold tracking-tight">
            CrewMate
          </span>
        )}
        {isCollapsed && (
          <span className="text-h2 text-on-brand font-semibold mx-auto">C</span>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            'text-white/60 hover:text-white transition-colors rounded p-space-1',
            isCollapsed && 'mx-auto',
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-space-2 py-space-2 overflow-y-auto">
        <ul className="space-y-space-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarNavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname.startsWith(item.href)}
                isCollapsed={isCollapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* User pod */}
      <UserPod isCollapsed={isCollapsed} />
    </aside>
  );
}
