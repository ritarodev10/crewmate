'use client';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { Breadcrumbs } from './Breadcrumbs';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function TopbarUserCluster() {
  const router = useRouter();
  const { name, clearSession } = useSessionStore();

  function handleSignOut() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="flex items-center gap-space-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-soft text-brand text-small font-semibold">
        {getInitials(name)}
      </span>
      {name && (
        <span className="text-body text-default hidden md:block">{name}</span>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className="text-muted hover:text-default transition-colors p-space-1 rounded"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Topbar() {
  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-surface border-b border-line z-[20] flex items-center px-space-6 gap-space-4">
      {/* Left: breadcrumbs / page title */}
      <div className="flex-1 flex items-center gap-space-3 min-w-0">
        <Breadcrumbs />
        {/* Preview pill */}
        <span className="inline-flex items-center gap-space-1 px-space-2 py-space-1 rounded-sm bg-warn-fade text-warn text-micro uppercase tracking-[0.05em]">
          <Eye size={12} strokeWidth={1.75} aria-hidden="true" />
          Preview
        </span>
      </div>

      {/* Right: user cluster */}
      <div className="shrink-0">
        <TopbarUserCluster />
      </div>
    </header>
  );
}
