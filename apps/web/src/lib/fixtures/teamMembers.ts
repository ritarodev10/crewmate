/**
 * Fixture team members — 7 entries.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type TeamMemberRole = 'tenant_admin' | 'coordinator' | 'worker' | 'custom';
export type TeamMemberScopeType = 'tenant' | 'region' | 'property_list';
export type TeamMemberStatus = 'active' | 'invited';

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  customRoleName: string | null; // only when role === 'custom'
  scopeType: TeamMemberScopeType;
  scopeLabel: string;           // human-readable scope description
  lastActive: string | null;    // ISO 8601, null if never logged in
  status: TeamMemberStatus;
  invitedAt: string | null;     // ISO 8601, only for invited members
  avatarInitials: string;       // 2 chars
  avatarColor: string;          // hex from palette
};

export const FIXTURE_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-001',
    userId: 'user-001',
    name: 'Alex Chen',
    email: 'admin@brookline.demo',
    role: 'tenant_admin',
    customRoleName: null,
    scopeType: 'tenant',
    scopeLabel: 'All properties',
    lastActive: '2026-06-04T08:15:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'AC',
    avatarColor: '#1F3A5F',
  },
  {
    id: 'tm-002',
    userId: 'user-002',
    name: 'Rachel Torres',
    email: 'coordinator1@brookline.demo',
    role: 'coordinator',
    customRoleName: null,
    scopeType: 'region',
    scopeLabel: 'Greater Boston',
    lastActive: '2026-06-04T07:58:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'RT',
    avatarColor: '#2C5C8A',
  },
  {
    id: 'tm-003',
    userId: 'user-003',
    name: 'David Kim',
    email: 'coordinator2@brookline.demo',
    role: 'coordinator',
    customRoleName: null,
    scopeType: 'property_list',
    scopeLabel: 'Harborview, The Aldgate',
    lastActive: '2026-06-04T07:30:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'DK',
    avatarColor: '#2F7D5E',
  },
  {
    id: 'tm-004',
    userId: 'user-004',
    name: 'Marcus Webb',
    email: 'worker@brookline.demo',
    role: 'worker',
    customRoleName: null,
    scopeType: 'property_list',
    scopeLabel: 'Brookline Heights, Maple Court',
    lastActive: '2026-06-04T06:45:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'MW',
    avatarColor: '#B7791F',
  },
  {
    id: 'tm-005',
    userId: 'user-005',
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@brookline.demo',
    role: 'worker',
    customRoleName: null,
    scopeType: 'property_list',
    scopeLabel: 'Northgate Commercial',
    lastActive: '2026-06-03T16:00:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'YT',
    avatarColor: '#6B3FA0',
  },
  {
    id: 'tm-006',
    userId: 'user-006',
    name: 'Dana Osei',
    email: 'dana.osei@brookline.demo',
    role: 'custom',
    customRoleName: 'Maintenance Lead',
    scopeType: 'region',
    scopeLabel: 'Cambridge',
    lastActive: '2026-06-03T14:30:00Z',
    status: 'active',
    invitedAt: null,
    avatarInitials: 'DO',
    avatarColor: '#B23A48',
  },
  {
    id: 'tm-007',
    userId: 'user-007',
    name: 'Sam Okafor',
    email: 'sam.okafor@brookline.demo',
    role: 'coordinator',
    customRoleName: null,
    scopeType: 'tenant',
    scopeLabel: 'All properties',
    lastActive: null, // never logged in — pending invite
    status: 'invited',
    invitedAt: '2026-06-04T09:00:00Z',
    avatarInitials: 'SO',
    avatarColor: '#D4A24C',
  },
];
