import { http, HttpResponse } from 'msw';
import { FIXTURE_USERS } from '@/lib/fixtures/users';

const adminUser = FIXTURE_USERS.find((u) => u.role === 'tenant_admin') ?? FIXTURE_USERS[0];

export const settingsHandlers = [
  http.get('/v1/settings/profile', () => {
    return HttpResponse.json(adminUser);
  }),

  http.patch('/v1/settings/profile', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...adminUser, ...body });
  }),

  http.get('/v1/settings/account', () => {
    return HttpResponse.json({
      operatorName: 'Brookline Property Co.',
      slug: 'brookline-property-co',
      timezone: 'America/New_York',
      defaultJobDurationMin: 90,
    });
  }),

  http.patch('/v1/settings/account', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      operatorName: 'Brookline Property Co.',
      slug: 'brookline-property-co',
      timezone: 'America/New_York',
      defaultJobDurationMin: 90,
      ...body,
    });
  }),

  http.get('/v1/settings/notifications', () => {
    return HttpResponse.json({
      preferences: [
        { kind: 'job.assigned', emailEnabled: true },
        { kind: 'job.completed', emailEnabled: false },
        { kind: 'worker.invited', emailEnabled: true },
        { kind: 'webhook.failed', emailEnabled: true },
      ],
    });
  }),

  http.patch('/v1/settings/notifications', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(body);
  }),
];
