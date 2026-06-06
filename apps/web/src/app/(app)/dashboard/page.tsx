import { cookies } from 'next/headers'
import { getServerSession, SESSION_COOKIE } from '@web/lib/session'
import { TopBar } from '@web/components/layout/TopBar'
import { DashboardClient } from './_components/DashboardClient'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const mainSession = sessionRaw ? (JSON.parse(sessionRaw) as { accessToken?: string }) : null
  const token: string | undefined = session?.accessToken ?? mainSession?.accessToken

  return (
    <>
      <TopBar session={session} />
      <DashboardClient token={token} session={session} />
    </>
  )
}
