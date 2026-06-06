import { cookies } from 'next/headers'
import { TopBar } from '@web/components/layout/TopBar'
import { getServerSession } from '@web/lib/session'

export default async function RevenuePage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto p-6">
        <p className="text-muted text-sm">Revenue screen coming in a later wave…</p>
      </main>
    </>
  )
}
