import type { ReactNode } from 'react';

export default function TodayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
