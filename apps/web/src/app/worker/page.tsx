import { cookies } from 'next/headers'
import { getServerSession } from '@web/lib/session'

export default async function WorkerPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-default">
          {session?.name ?? 'Worker'}
        </h1>
        <p className="text-sm text-muted mt-1">Worker view coming soon</p>
      </div>
    </div>
  )
}
