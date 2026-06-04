/**
 * Apollo MockedProvider mocks for all Phase 2 GraphQL documents.
 *
 * These mocks eliminate real network calls in Phase 2. Phase 4 wires the real
 * client. Documents use inline gql`` tags because codegen runs in Phase 3.
 *
 * Usage:
 *   import { MockedProvider } from '@apollo/client/testing';
 *   import { apolloMocks } from '@/lib/msw/apollo-mocks';
 *   <MockedProvider mocks={apolloMocks} addTypename={false}>...</MockedProvider>
 */

import { gql, type DocumentNode } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import {
  FIXTURE_JOBS,
  FIXTURE_SCHEDULE_EVENTS,
  FIXTURE_TEAM_MEMBERS,
  FIXTURE_CUSTOM_ROLES,
  FIXTURE_AUDIT_ROWS,
  FIXTURE_KPI_CARDS,
  FIXTURE_CHART_POINTS,
  FIXTURE_PROPERTY_BARS,
  FIXTURE_WORKER_SPARKLINES,
} from '@/lib/fixtures';

// ── Query documents ────────────────────────────────────────────────────────────

const GET_DASHBOARD_KPIS: DocumentNode = gql`
  query GetDashboardKpis {
    kpiCards {
      label
      value
      unit
      trend
      trendDelta
    }
    chartPoints {
      date
      completed
      scheduled
    }
    propertyBars {
      propertyId
      propertyName
      jobCount
      onTimeRate
    }
    workerSparklines {
      workerId
      workerName
      points
    }
  }
`;

const GET_JOBS: DocumentNode = gql`
  query GetJobs {
    jobs {
      id
      status
      title
      priority
      propertyId
      propertyName
      workerId
      workerName
      scheduledStart
      scheduledEnd
      notes
      operatorId
    }
  }
`;

const GET_JOB: DocumentNode = gql`
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      status
      title
      priority
      propertyId
      propertyName
      workerId
      workerName
      scheduledStart
      scheduledEnd
      notes
      operatorId
    }
  }
`;

const GET_JOB_ACTIVITY: DocumentNode = gql`
  query GetJobActivity($id: ID!) {
    jobActivity(jobId: $id) {
      id
      timestamp
      actorName
      event
      note
    }
  }
`;

const GET_SCHEDULE_EVENTS: DocumentNode = gql`
  query GetScheduleEvents {
    scheduleEvents {
      id
      jobId
      workerId
      workerName
      propertyId
      propertyName
      date
      startTime
      endTime
      status
      priority
      operatorId
    }
  }
`;

const GET_WORKER_TODAY_JOBS: DocumentNode = gql`
  query GetWorkerTodayJobs($workerId: ID!) {
    workerTodayJobs(workerId: $workerId) {
      id
      status
      title
      priority
      propertyId
      propertyName
      scheduledStart
      scheduledEnd
      notes
      operatorId
    }
  }
`;

const GET_TEAM_MEMBERS: DocumentNode = gql`
  query GetTeamMembers {
    teamMembers {
      id
      userId
      name
      email
      role
      customRoleName
      scopeType
      scopeLabel
      lastActive
      status
      invitedAt
      avatarInitials
      avatarColor
    }
  }
`;

const GET_CUSTOM_ROLES: DocumentNode = gql`
  query GetCustomRoles {
    customRoles {
      id
      name
      description
      permissions {
        action
        subject
      }
      createdAt
      operatorId
    }
  }
`;

const GET_AUDIT_LOG: DocumentNode = gql`
  query GetAuditLog {
    auditLog {
      id
      timestamp
      actorId
      actorName
      actorRole
      subject
      subjectId
      action
      decision
      reason
      requestId
      operatorId
    }
  }
`;

// ── Activity events (used by job detail drawer) ────────────────────────────────

const FIXTURE_JOB_ACTIVITY = [
  { id: 'act-001', timestamp: '2026-06-04T08:00:00Z', actorName: 'Rachel Torres', event: 'status_changed', note: 'Status changed from scheduled to en_route' },
  { id: 'act-002', timestamp: '2026-06-04T07:45:00Z', actorName: 'Alex Chen', event: 'worker_assigned', note: 'Worker Marcus Webb assigned' },
  { id: 'act-003', timestamp: '2026-06-04T07:30:00Z', actorName: 'David Kim', event: 'created', note: 'Job created' },
  { id: 'act-004', timestamp: '2026-06-03T16:00:00Z', actorName: 'Rachel Torres', event: 'notes_updated', note: 'Notes updated: access code 4421' },
  { id: 'act-005', timestamp: '2026-06-03T09:00:00Z', actorName: 'Alex Chen', event: 'scheduled', note: 'Job scheduled for 2026-06-05 09:00' },
];

// ── Mocked responses ───────────────────────────────────────────────────────────

export const apolloMocks: MockedResponse[] = [
  {
    request: { query: GET_DASHBOARD_KPIS },
    result: {
      data: {
        kpiCards: FIXTURE_KPI_CARDS,
        chartPoints: FIXTURE_CHART_POINTS,
        propertyBars: FIXTURE_PROPERTY_BARS,
        workerSparklines: FIXTURE_WORKER_SPARKLINES,
      },
    },
  },
  {
    request: { query: GET_JOBS },
    result: {
      data: {
        jobs: FIXTURE_JOBS,
      },
    },
  },
  {
    request: { query: GET_JOB, variables: { id: FIXTURE_JOBS[0]?.id ?? 'job-001' } },
    result: {
      data: {
        job: FIXTURE_JOBS[0] ?? null,
      },
    },
  },
  {
    request: { query: GET_JOB_ACTIVITY, variables: { id: FIXTURE_JOBS[0]?.id ?? 'job-001' } },
    result: {
      data: {
        jobActivity: FIXTURE_JOB_ACTIVITY,
      },
    },
  },
  {
    request: { query: GET_SCHEDULE_EVENTS },
    result: {
      data: {
        scheduleEvents: FIXTURE_SCHEDULE_EVENTS,
      },
    },
  },
  {
    request: { query: GET_WORKER_TODAY_JOBS, variables: { workerId: 'worker-001' } },
    result: {
      data: {
        workerTodayJobs: FIXTURE_JOBS.filter((j) => j.workerId === 'worker-001').slice(0, 4),
      },
    },
  },
  {
    request: { query: GET_TEAM_MEMBERS },
    result: {
      data: {
        teamMembers: FIXTURE_TEAM_MEMBERS,
      },
    },
  },
  {
    request: { query: GET_CUSTOM_ROLES },
    result: {
      data: {
        customRoles: FIXTURE_CUSTOM_ROLES,
      },
    },
  },
  {
    request: { query: GET_AUDIT_LOG },
    result: {
      data: {
        auditLog: FIXTURE_AUDIT_ROWS,
      },
    },
  },
];
