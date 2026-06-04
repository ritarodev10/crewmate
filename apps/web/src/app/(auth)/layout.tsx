import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-full">{children}</div>
    </div>
  );
}
