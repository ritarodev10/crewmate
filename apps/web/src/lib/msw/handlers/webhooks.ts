import { http, HttpResponse } from 'msw';
import { FIXTURE_WEBHOOK_DELIVERIES } from '@/lib/fixtures/webhookDeliveries';

export const webhookHandlers = [
  http.get('/v1/webhooks/deliveries', () => {
    return HttpResponse.json({
      items: FIXTURE_WEBHOOK_DELIVERIES,
      total: FIXTURE_WEBHOOK_DELIVERIES.length,
      nextCursor: null,
    });
  }),

  http.post('/v1/webhooks/deliveries/:id/retry', ({ params }) => {
    const { id } = params as { id: string };
    const delivery = FIXTURE_WEBHOOK_DELIVERIES.find((d) => d.id === id);
    if (!delivery) {
      return HttpResponse.json({ error: 'delivery_not_found' }, { status: 404 });
    }
    return HttpResponse.json({ ...delivery, status: 'retrying' });
  }),

  http.post('/v1/webhooks/endpoints/:id/test', ({ params }) => {
    const { id } = params as { id: string };
    const testDelivery = {
      id: `wh-test-${Date.now()}`,
      eventType: 'job.completed',
      endpointUrl: 'https://hooks.acme.io/crewmate',
      endpointId: id,
      status: 'delivered' as const,
      attempt: 1,
      timestamp: new Date().toISOString(),
      latencyMs: 134,
      responseCode: 200,
      requestPayload: {
        event: 'job.completed',
        data: { jobId: 'job-001', test: true },
      },
      responseBody: '{"ok":true}',
      operatorId: 'op-brookline-001',
    };
    return HttpResponse.json(testDelivery, { status: 201 });
  }),
];
