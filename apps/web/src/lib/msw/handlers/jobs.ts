import { http, HttpResponse } from 'msw';
import { FIXTURE_JOBS } from '@/lib/fixtures/jobs';

export const jobHandlers = [
  http.get('/v1/jobs', () => {
    return HttpResponse.json({
      items: FIXTURE_JOBS,
      total: FIXTURE_JOBS.length,
      nextCursor: null,
    });
  }),

  http.post('/v1/jobs/:id/transition', async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = await request.json() as { status: string };
    const job = FIXTURE_JOBS.find((j) => j.id === id);
    if (!job) {
      return HttpResponse.json({ error: 'job_not_found' }, { status: 404 });
    }
    return HttpResponse.json({ ...job, status: body.status });
  }),
];
