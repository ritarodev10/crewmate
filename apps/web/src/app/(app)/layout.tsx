import { cookies } from 'next/headers'
import { Sidebar } from '@web/components/layout/Sidebar'
import type { Session } from '@web/lib/session'
import { SESSION_COOKIE, DEMO_ACTOR_COOKIE } from '@web/lib/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const demoActorRaw = cookieStore.get(DEMO_ACTOR_COOKIE)?.value
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value

  let session: Session | null = null
  try {
    if (demoActorRaw) session = JSON.parse(demoActorRaw) as Session
    else if (sessionRaw) session = JSON.parse(sessionRaw) as Session
  } catch { session = null }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar session={session} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  )
}
