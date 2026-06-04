/**
 * Fixture audit log rows — 10 entries (7 Allow, 3 Deny).
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type AuditSubject =
  | 'Job'
  | 'Worker'
  | 'Property'
  | 'User'
  | 'WebhookEndpoint'
  | 'CustomRole';

export type AuditDecision = 'Allow' | 'Deny';

export type AuditRow = {
  id: string;
  timestamp: string; // ISO 8601
  actorId: string;
  actorName: string;
  actorRole: string;
  subject: AuditSubject;
  subjectId: string;
  action: string;
  decision: AuditDecision;
  reason: string | null; // non-null when decision === 'Deny'
  requestId: string;
  operatorId: string;
};

const OPERATOR_ID = 'op-brookline-001';

export const FIXTURE_AUDIT_ROWS: AuditRow[] = [
  // ── Allow (7) ──────────────────────────────────────────────────────────────
  {
    id: 'audit-001',
    timestamp: '2026-06-04T08:12:01Z',
    actorId: 'user-001',
    actorName: 'Alex Chen',
    actorRole: 'tenant_admin',
    subject: 'Job',
    subjectId: 'job-005',
    action: 'jobs:transition',
    decision: 'Allow',
    reason: null,
    requestId: 'req-a1b2c3d4',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-002',
    timestamp: '2026-06-04T07:55:00Z',
    actorId: 'user-002',
    actorName: 'Rachel Torres',
    actorRole: 'coordinator',
    subject: 'Worker',
    subjectId: 'worker-001',
    action: 'workers:assign',
    decision: 'Allow',
    reason: null,
    requestId: 'req-b2c3d4e5',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-003',
    timestamp: '2026-06-04T07:30:00Z',
    actorId: 'user-003',
    actorName: 'David Kim',
    actorRole: 'coordinator',
    subject: 'Job',
    subjectId: 'job-008',
    action: 'jobs:transition',
    decision: 'Allow',
    reason: null,
    requestId: 'req-c3d4e5f6',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-004',
    timestamp: '2026-06-03T15:30:00Z',
    actorId: 'user-001',
    actorName: 'Alex Chen',
    actorRole: 'tenant_admin',
    subject: 'WebhookEndpoint',
    subjectId: 'ep-002',
    action: 'webhooks:create',
    decision: 'Allow',
    reason: null,
    requestId: 'req-d4e5f6g7',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-005',
    timestamp: '2026-06-03T14:00:00Z',
    actorId: 'user-001',
    actorName: 'Alex Chen',
    actorRole: 'tenant_admin',
    subject: 'User',
    subjectId: 'user-003',
    action: 'team:invite',
    decision: 'Allow',
    reason: null,
    requestId: 'req-e5f6g7h8',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-006',
    timestamp: '2026-06-03T12:00:00Z',
    actorId: 'user-002',
    actorName: 'Rachel Torres',
    actorRole: 'coordinator',
    subject: 'Property',
    subjectId: 'prop-003',
    action: 'properties:read',
    decision: 'Allow',
    reason: null,
    requestId: 'req-f6g7h8i9',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-007',
    timestamp: '2026-06-03T10:15:00Z',
    actorId: 'user-001',
    actorName: 'Alex Chen',
    actorRole: 'tenant_admin',
    subject: 'CustomRole',
    subjectId: 'role-001',
    action: 'roles:create',
    decision: 'Allow',
    reason: null,
    requestId: 'req-g7h8i9j0',
    operatorId: OPERATOR_ID,
  },
  // ── Deny (3) — reason is always non-null ───────────────────────────────────
  {
    id: 'audit-008',
    timestamp: '2026-06-04T06:45:00Z',
    actorId: 'user-004',
    actorName: 'Marcus Webb',
    actorRole: 'worker',
    subject: 'Job',
    subjectId: 'job-001',
    action: 'jobs:transition',
    decision: 'Deny',
    reason: 'workers may only transition jobs currently assigned to them',
    requestId: 'req-h8i9j0k1',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-009',
    timestamp: '2026-06-03T17:30:00Z',
    actorId: 'user-003',
    actorName: 'David Kim',
    actorRole: 'coordinator',
    subject: 'WebhookEndpoint',
    subjectId: 'ep-001',
    action: 'webhooks:delete',
    decision: 'Deny',
    reason: 'coordinators do not have permission to delete webhook endpoints',
    requestId: 'req-i9j0k1l2',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'audit-010',
    timestamp: '2026-06-03T09:00:00Z',
    actorId: 'user-002',
    actorName: 'Rachel Torres',
    actorRole: 'coordinator',
    subject: 'User',
    subjectId: 'user-001',
    action: 'team:remove',
    decision: 'Deny',
    reason: 'coordinators cannot remove tenant_admin users',
    requestId: 'req-j0k1l2m3',
    operatorId: OPERATOR_ID,
  },
];
