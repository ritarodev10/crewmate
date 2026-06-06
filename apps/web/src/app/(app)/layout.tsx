import { cookies } from 'next/headers'
import { Sidebar } from '@web/components/layout/Sidebar'
import { TopBar } from '@web/components/layout/TopBar'
import { getServerSession } from '@web/lib/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar session={session} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar session={session} />
        {children}
      </div>
    </div>
  )
}
