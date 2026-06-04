/**
 * Fixture custom roles — 2 entries.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type Permission = {
  action: string;
  subject: string;
};

export type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  createdAt: string; // ISO 8601
  operatorId: string;
};

const OPERATOR_ID = 'op-brookline-001';

export const FIXTURE_CUSTOM_ROLES: CustomRole[] = [
  {
    id: 'role-001',
    name: 'Maintenance Lead',
    description: 'Can manage and transition jobs, assign workers within their property scope, and view webhook deliveries. Cannot modify team or billing settings.',
    permissions: [
      { action: 'read', subject: 'Job' },
      { action: 'transition', subject: 'Job' },
      { action: 'assign', subject: 'Job' },
      { action: 'read', subject: 'Worker' },
      { action: 'read', subject: 'Property' },
      { action: 'read', subject: 'WebhookDelivery' },
    ],
    createdAt: '2026-05-15T10:00:00Z',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'role-002',
    name: 'Property Inspector',
    description: 'Read-only access to jobs and properties for audit and inspection purposes. Cannot modify any records.',
    permissions: [
      { action: 'read', subject: 'Job' },
      { action: 'read', subject: 'Property' },
    ],
    createdAt: '2026-05-20T14:30:00Z',
    operatorId: OPERATOR_ID,
  },
];
