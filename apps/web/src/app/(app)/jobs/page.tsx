import { cookies } from 'next/headers'
import { getServerSession, SESSION_COOKIE } from '@web/lib/session'
import { JobsKanban } from './_components/JobsKanban'

export default async function JobsPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const mainSession = sessionRaw ? (JSON.parse(sessionRaw) as { accessToken?: string }) : null
  const token: string | undefined = session?.accessToken ?? mainSession?.accessToken

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-6">
        <JobsKanban session={session} token={token} />
      </div>
    </main>
  )
}
