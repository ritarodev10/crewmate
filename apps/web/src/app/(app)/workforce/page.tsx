import { cookies } from 'next/headers'
import { TopBar } from '@web/components/layout/TopBar'
import type { Session } from '@web/lib/session'
import { SESSION_COOKIE, DEMO_ACTOR_COOKIE } from '@web/lib/session'

export default async function WorkforcePage() {
  const cookieStore = await cookies()
  const demoActorRaw = cookieStore.get(DEMO_ACTOR_COOKIE)?.value
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  let session: Session | null = null
  try {
    if (demoActorRaw) session = JSON.parse(demoActorRaw) as Session
    else if (sessionRaw) session = JSON.parse(sessionRaw) as Session
  } catch { session = null }

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-muted text-sm">Workforce screen coming in a later wave…</p>
      </main>
    </>
  )
}
