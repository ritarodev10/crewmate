import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@web/lib/session'
import { JOBS, WORKERS } from '@web/data/seed'
import { JobProgressView } from '../../_components/JobProgressView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkerJobDetailPage({ params }: PageProps) {
  const { id } = await params
  const job = JOBS.find(j => j.id === id)
  if (!job) notFound()

  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)
  const worker = WORKERS.find(w => w.id === session?.workerId) ?? WORKERS[0]

  const customerName = job.customer?.name ?? 'Job Detail'

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-canvas flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-sidebar text-white px-4 py-3 flex items-center gap-3">
        <Link href="/worker" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
          ← Back
        </Link>
        <p className="flex-1 text-center font-semibold text-sm truncate pr-12">
          {customerName}
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <JobProgressView job={job} worker={worker} />
      </div>
    </div>
  )
}
