import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CrewMate — Worker',
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {children}
    </div>
  )
}
