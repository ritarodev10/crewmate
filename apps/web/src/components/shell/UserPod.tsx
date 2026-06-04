'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useSessionStore } from '@/store/session';
import { cn } from '@/lib/cn';

interface UserPodProps {
  isCollapsed?: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function UserPod({ isCollapsed }: UserPodProps) {
  const router = useRouter();
  const { name, role, clearSession } = useSessionStore();

  async function handleSignOut() {
    // Clear session cookie by setting maxAge to 0
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {
      // Fallback: clear via document.cookie if API not available
    });
    clearSession();
    router.push('/login');
  }

  const initials = getInitials(name);

  const roleLabel =
    role === 'tenant_admin'
      ? 'Admin'
      : role === 'coordinator'
        ? 'Coordinator'
        : role === 'worker'
          ? 'Worker'
          : '';

  if (isCollapsed) {
    return (
      <div className="p-space-3 border-t border-white/20">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center"
          aria-label="Sign out"
          title="Sign out"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-on-brand text-small font-semibold">
            {initials}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-space-3 border-t border-white/20">
      <div className="flex items-center gap-space-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-on-brand text-small font-semibold shrink-0">
          {initials}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-body-strong text-on-brand truncate',
              !name && 'text-white/40',
            )}
          >
            {name ?? 'Guest'}
          </p>
          {roleLabel && (
            <p className="text-small text-white/60 truncate">{roleLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-white/60 hover:text-white transition-colors p-space-1 rounded"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
