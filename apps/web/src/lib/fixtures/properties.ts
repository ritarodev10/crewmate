/**
 * Fixture properties — 5 entries.
 * Phase 2 only: replace with @crewmate/contracts types in Phase 3.
 */

export type PropertyKind = 'residential' | 'commercial' | 'hospitality';

export type FixtureProperty = {
  id: string;
  name: string;
  kind: PropertyKind;
  address: string;
  region: string | null;
  jobCount: number;
  lastActivity: string; // ISO 8601
  operatorId: string;
};

const OPERATOR_ID = 'op-brookline-001';

export const FIXTURE_PROPERTIES: FixtureProperty[] = [
  {
    id: 'prop-001',
    name: 'Brookline Heights',
    kind: 'residential',
    address: '420 Beacon St, Brookline, MA 02446',
    region: 'Greater Boston',
    jobCount: 14,
    lastActivity: '2026-06-04T07:32:00Z',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'prop-002',
    name: 'Harborview Residences',
    kind: 'residential',
    address: '88 Atlantic Ave, Boston, MA 02110',
    region: 'Downtown',
    jobCount: 9,
    lastActivity: '2026-06-04T08:15:00Z',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'prop-003',
    name: 'The Aldgate',
    kind: 'residential',
    address: '215 Newbury St, Boston, MA 02116',
    region: 'Back Bay',
    jobCount: 11,
    lastActivity: '2026-06-03T17:00:00Z',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'prop-004',
    name: 'Maple Court Hospitality',
    kind: 'hospitality',
    address: '1 Maple Court, Cambridge, MA 02139',
    region: 'Cambridge',
    jobCount: 7,
    lastActivity: '2026-06-04T06:20:00Z',
    operatorId: OPERATOR_ID,
  },
  {
    id: 'prop-005',
    name: 'Northgate Commercial',
    kind: 'commercial',
    address: '350 Congress St, Boston, MA 02210',
    region: 'Seaport',
    jobCount: 6,
    lastActivity: '2026-06-04T08:00:00Z',
    operatorId: OPERATOR_ID,
  },
];
