import { cookies } from 'next/headers'
import { getServerSession, SESSION_COOKIE } from '@web/lib/session'
import { TopBar } from '@web/components/layout/TopBar'
import { JobsKanban } from './_components/JobsKanban'

export default async function JobsPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const mainSession = sessionRaw ? (JSON.parse(sessionRaw) as { accessToken?: string }) : null
  const token: string | undefined = session?.accessToken ?? mainSession?.accessToken

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-line bg-canvas px-6 py-4">
          <h2 className="text-lg font-semibold text-default leading-tight">Jobs</h2>
          <p className="text-xs text-muted mt-0.5">Today&apos;s dispatch board</p>
        </div>
        <div className="p-6">
          <JobsKanban session={session} token={token} />
        </div>
      </main>
    </>
  )
}
