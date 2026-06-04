interface JobDetailPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { jobId } = await params;
  return <div className="p-space-8 text-default">Job {jobId} — coming in Wave 2.2</div>;
}
