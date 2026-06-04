import type { ReactNode } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-[220px]">
        <Topbar />
        <main className="flex-1 pt-14 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
