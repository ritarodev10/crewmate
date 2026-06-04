/**
 * Fixture workers — 5 entries.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type WorkerStatus = 'available' | 'on_job';

export type FixtureWorker = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: WorkerStatus;
  role: 'worker';
  userId: string | null;
  avatarInitials: string; // 2 chars
  avatarColor: string;    // hex from palette
  operatorId: string;
  lastActive: string;     // ISO 8601
};

const OPERATOR_ID = 'op-brookline-001';

// Avatar palette: 6 colors from semantic system
const AVATAR_COLORS = [
  '#2C5C8A', // info
  '#2F7D5E', // success
  '#B7791F', // warn
  '#6B3FA0', // purple (design token --color-purple, not in main palette but used for avatars)
  '#B23A48', // danger
  '#D4A24C', // accent
] as const;

export const FIXTURE_WORKERS: FixtureWorker[] = [
  // ── Available (3) ──────────────────────────────────────────────────────────
  {
    id: 'worker-001',
    name: 'Marcus Webb',
    email: 'marcus.webb@brookline.demo',
    phone: '+1 617 555 0101',
    status: 'available',
    role: 'worker',
    userId: 'user-004',
    avatarInitials: 'MW',
    avatarColor: AVATAR_COLORS[0],
    operatorId: OPERATOR_ID,
    lastActive: '2026-06-04T06:45:00Z',
  },
  {
    id: 'worker-002',
    name: 'Priya Nair',
    email: 'priya.nair@brookline.demo',
    phone: '+1 617 555 0102',
    status: 'available',
    role: 'worker',
    userId: null,
    avatarInitials: 'PN',
    avatarColor: AVATAR_COLORS[1],
    operatorId: OPERATOR_ID,
    lastActive: '2026-06-04T07:10:00Z',
  },
  {
    id: 'worker-003',
    name: 'Olu Adeleke',
    email: 'olu.adeleke@brookline.demo',
    phone: '+1 617 555 0103',
    status: 'available',
    role: 'worker',
    userId: null,
    avatarInitials: 'OA',
    avatarColor: AVATAR_COLORS[2],
    operatorId: OPERATOR_ID,
    lastActive: '2026-06-04T07:00:00Z',
  },
  // ── On Job (2) ─────────────────────────────────────────────────────────────
  {
    id: 'worker-004',
    name: 'Sofia Larsson',
    email: 'sofia.larsson@brookline.demo',
    phone: '+1 617 555 0104',
    status: 'on_job',
    role: 'worker',
    userId: null,
    avatarInitials: 'SL',
    avatarColor: AVATAR_COLORS[3],
    operatorId: OPERATOR_ID,
    lastActive: '2026-06-04T08:05:00Z',
  },
  {
    id: 'worker-005',
    name: 'Jamie Rivera',
    email: 'jamie.rivera@brookline.demo',
    phone: '+1 617 555 0105',
    status: 'on_job',
    role: 'worker',
    userId: null,
    avatarInitials: 'JR',
    avatarColor: AVATAR_COLORS[4],
    operatorId: OPERATOR_ID,
    lastActive: '2026-06-04T07:55:00Z',
  },
];
