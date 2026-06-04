/**
 * Fixture users and sessions.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 *
 * Session cookie shape: { userId, role, operatorId, name }
 */

export type UserRole = 'tenant_admin' | 'coordinator' | 'worker';

export type FixtureUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  operatorId: string;
};

export type FixtureSession = {
  userId: string;
  role: UserRole;
  operatorId: string;
  name: string;
};

const OPERATOR_ID = 'op-brookline-001';

export const FIXTURE_USERS: FixtureUser[] = [
  {
    id: 'user-001',
    email: 'admin@brookline.demo',
    name: 'Alex Chen',
    role: 'tenant_admin',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'user-002',
    email: 'coordinator1@brookline.demo',
    name: 'Rachel Torres',
    role: 'coordinator',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'user-003',
    email: 'coordinator2@brookline.demo',
    name: 'David Kim',
    role: 'coordinator',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'user-004',
    email: 'worker@brookline.demo',
    name: 'Marcus Webb',
    role: 'worker',
    operatorId: OPERATOR_ID,
  },
];

/**
 * Keyed by email — used by the mock login action to create a fixture session cookie.
 * Any password is accepted in Phase 2 demo mode.
 */
export const FIXTURE_SESSIONS: Record<string, FixtureSession> = {
  'admin@brookline.demo': {
    userId: 'user-001',
    role: 'tenant_admin',
    operatorId: OPERATOR_ID,
    name: 'Alex Chen',
  },
  'coordinator1@brookline.demo': {
    userId: 'user-002',
    role: 'coordinator',
    operatorId: OPERATOR_ID,
    name: 'Rachel Torres',
  },
  'coordinator2@brookline.demo': {
    userId: 'user-003',
    role: 'coordinator',
    operatorId: OPERATOR_ID,
    name: 'David Kim',
  },
  'worker@brookline.demo': {
    userId: 'user-004',
    role: 'worker',
    operatorId: OPERATOR_ID,
    name: 'Marcus Webb',
  },
};
