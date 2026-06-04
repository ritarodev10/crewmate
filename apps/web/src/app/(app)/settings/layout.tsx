import type { ReactNode } from 'react';
import Link from 'next/link';

const settingsNav = [
  { label: 'Team', href: '/settings/team' },
  { label: 'Roles', href: '/settings/team/roles' },
  { label: 'Audit log', href: '/settings/audit' },
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Account', href: '/settings/account' },
  { label: 'Notifications', href: '/settings/notifications' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      <nav className="w-[200px] shrink-0 border-r border-line bg-surface p-space-4">
        <p className="text-micro text-muted uppercase tracking-[0.05em] mb-space-3 px-space-2">
          Settings
        </p>
        <ul className="space-y-space-1">
          {settingsNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block px-space-2 py-space-2 rounded-md text-body text-default hover:bg-brand-soft hover:text-brand transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 overflow-y-auto p-space-8">
        {children}
      </div>
    </div>
  );
}
