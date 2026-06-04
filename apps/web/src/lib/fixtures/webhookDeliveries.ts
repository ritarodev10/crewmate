/**
 * Fixture webhook deliveries — 12 entries covering all status variants.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type WebhookDeliveryStatus = 'delivered' | 'retrying' | 'failed';

export type WebhookDelivery = {
  id: string;
  eventType: string;
  endpointUrl: string;
  endpointId: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  timestamp: string; // ISO 8601
  latencyMs: number;
  responseCode: number | null;
  requestPayload: Record<string, unknown>;
  responseBody: string | null;
  operatorId: string;
};

const OPERATOR_ID = 'op-brookline-001';
const ENDPOINT_A_ID = 'ep-001';
const ENDPOINT_A_URL = 'https://hooks.acme.io/crewmate';
const ENDPOINT_B_ID = 'ep-002';
const ENDPOINT_B_URL = 'https://api.propflow.dev/webhooks/crewmate';

export const FIXTURE_WEBHOOK_DELIVERIES: WebhookDelivery[] = [
  // ── Delivered (6) ──────────────────────────────────────────────────────────
  {
    id: 'wh-001',
    eventType: 'job.status.changed',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'delivered',
    attempt: 1,
    timestamp: '2026-06-04T08:12:04Z',
    latencyMs: 143,
    responseCode: 200,
    requestPayload: {
      event: 'job.status.changed',
      data: { jobId: 'job-005', status: 'en_route', previousStatus: 'scheduled' },
    },
    responseBody: '{"ok":true}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-002',
    eventType: 'job.status.changed',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'delivered',
    attempt: 1,
    timestamp: '2026-06-04T07:55:22Z',
    latencyMs: 98,
    responseCode: 200,
    requestPayload: {
      event: 'job.status.changed',
      data: { jobId: 'job-008', status: 'in_progress', previousStatus: 'en_route' },
    },
    responseBody: '{"ok":true}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-003',
    eventType: 'job.completed',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'delivered',
    attempt: 1,
    timestamp: '2026-06-03T15:31:00Z',
    latencyMs: 211,
    responseCode: 200,
    requestPayload: {
      event: 'job.completed',
      data: { jobId: 'job-014', completedAt: '2026-06-03T15:30:00Z' },
    },
    responseBody: '{"received":true,"id":"evt_9xk2"}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-004',
    eventType: 'worker.assigned',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'delivered',
    attempt: 1,
    timestamp: '2026-06-04T06:30:10Z',
    latencyMs: 74,
    responseCode: 200,
    requestPayload: {
      event: 'worker.assigned',
      data: { jobId: 'job-011', workerId: 'worker-001' },
    },
    responseBody: '{"ok":true}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-005',
    eventType: 'job.created',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'delivered',
    attempt: 1,
    timestamp: '2026-06-03T16:00:00Z',
    latencyMs: 188,
    responseCode: 201,
    requestPayload: {
      event: 'job.created',
      data: { jobId: 'job-002', propertyId: 'prop-002' },
    },
    responseBody: '{"created":true}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-006',
    eventType: 'job.status.changed',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'delivered',
    attempt: 2,
    timestamp: '2026-06-03T14:05:44Z',
    latencyMs: 320,
    responseCode: 200,
    requestPayload: {
      event: 'job.status.changed',
      data: { jobId: 'job-013', status: 'completed', previousStatus: 'in_progress' },
    },
    responseBody: '{"ok":true}',
    operatorId: OPERATOR_ID,
  },
  // ── Retrying (3) ───────────────────────────────────────────────────────────
  {
    id: 'wh-007',
    eventType: 'job.status.changed',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'retrying',
    attempt: 2,
    timestamp: '2026-06-04T08:20:00Z',
    latencyMs: 3001,
    responseCode: 503,
    requestPayload: {
      event: 'job.status.changed',
      data: { jobId: 'job-007', status: 'in_progress', previousStatus: 'en_route' },
    },
    responseBody: 'Service Unavailable',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-008',
    eventType: 'worker.assigned',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'retrying',
    attempt: 3,
    timestamp: '2026-06-04T07:40:00Z',
    latencyMs: 5012,
    responseCode: 502,
    requestPayload: {
      event: 'worker.assigned',
      data: { jobId: 'job-006', workerId: 'worker-004' },
    },
    responseBody: 'Bad Gateway',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-009',
    eventType: 'job.created',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'retrying',
    attempt: 1,
    timestamp: '2026-06-04T08:30:00Z',
    latencyMs: 2450,
    responseCode: 429,
    requestPayload: {
      event: 'job.created',
      data: { jobId: 'job-004', propertyId: 'prop-004' },
    },
    responseBody: '{"error":"rate_limited","retryAfter":60}',
    operatorId: OPERATOR_ID,
  },
  // ── Failed (3) — 2 with responseCode, 1 timeout (no response) ──────────────
  {
    id: 'wh-010',
    eventType: 'job.completed',
    endpointUrl: ENDPOINT_A_URL,
    endpointId: ENDPOINT_A_ID,
    status: 'failed',
    attempt: 5,
    timestamp: '2026-06-03T12:15:00Z',
    latencyMs: 4321,
    responseCode: 500,
    requestPayload: {
      event: 'job.completed',
      data: { jobId: 'job-012', completedAt: '2026-06-03T08:00:00Z' },
    },
    responseBody: 'Internal Server Error',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-011',
    eventType: 'worker.assigned',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'failed',
    attempt: 5,
    timestamp: '2026-06-03T10:00:00Z',
    latencyMs: 6800,
    responseCode: 404,
    requestPayload: {
      event: 'worker.assigned',
      data: { jobId: 'job-009', workerId: 'worker-004' },
    },
    responseBody: '{"error":"endpoint_not_found"}',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'wh-012',
    eventType: 'job.status.changed',
    endpointUrl: ENDPOINT_B_URL,
    endpointId: ENDPOINT_B_ID,
    status: 'failed',
    attempt: 5,
    timestamp: '2026-06-03T09:05:00Z',
    latencyMs: 30000, // timeout
    responseCode: null, // no response — connection timed out
    requestPayload: {
      event: 'job.status.changed',
      data: { jobId: 'job-010', status: 'in_progress', previousStatus: 'scheduled' },
    },
    responseBody: null,
    operatorId: OPERATOR_ID,
  },
];
