'use client';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dispatch': 'Dispatch board',
  '/schedule': 'Schedule',
  '/properties': 'Properties',
  '/webhooks': 'Webhooks',
  '/settings/team': 'Settings / Team',
  '/settings/team/roles': 'Settings / Roles',
  '/settings/audit': 'Settings / Audit log',
  '/settings/profile': 'Settings / Profile',
  '/settings/account': 'Settings / Account',
  '/settings/notifications': 'Settings / Notifications',
  '/today': 'Today',
};

function getPageLabel(pathname: string): string {
  // Exact match first
  const exact = ROUTE_LABELS[pathname];
  if (exact) return exact;

  // Check dispatch job detail
  if (pathname.startsWith('/dispatch/')) return 'Dispatch / Job';

  // Check settings sub-paths
  if (pathname.startsWith('/settings/')) return 'Settings';

  return pathname.replace(/^\//, '').replace(/-/g, ' ');
}

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

function getSegments(pathname: string): BreadcrumbSegment[] {
  if (pathname.startsWith('/settings/')) {
    const subLabel = ROUTE_LABELS[pathname];
    const parts = subLabel ? subLabel.split(' / ') : ['Settings'];
    if (parts.length === 2) {
      return [
        { label: 'Settings', href: '/settings/team' },
        { label: parts[1] ?? '' },
      ];
    }
    return [{ label: 'Settings' }];
  }

  if (pathname.startsWith('/dispatch/') && pathname !== '/dispatch') {
    return [
      { label: 'Dispatch', href: '/dispatch' },
      { label: 'Job detail' },
    ];
  }

  const label = getPageLabel(pathname);
  return [{ label }];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = getSegments(pathname);

  if (segments.length === 1) {
    return (
      <span className="text-h1 text-default font-bold">
        {segments[0]?.label ?? ''}
      </span>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-space-1">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={index} className="flex items-center gap-space-1">
            {index > 0 && (
              <ChevronRight
                size={14}
                strokeWidth={1.75}
                className="text-muted"
                aria-hidden="true"
              />
            )}
            {isLast || !segment.href ? (
              <span
                className={
                  isLast ? 'text-h1 text-default font-bold' : 'text-small text-muted'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {segment.label}
              </span>
            ) : (
              <a
                href={segment.href}
                className="text-small text-muted hover:text-default transition-colors"
              >
                {segment.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
