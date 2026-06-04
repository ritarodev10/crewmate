'use client';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed?: boolean;
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-space-3 px-space-3 py-space-2 rounded-md text-body transition-colors',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
