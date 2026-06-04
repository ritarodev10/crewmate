import { http, HttpResponse } from 'msw';
import { FIXTURE_TEAM_MEMBERS } from '@/lib/fixtures/teamMembers';
import { FIXTURE_AUDIT_ROWS } from '@/lib/fixtures/auditRows';

export const teamHandlers = [
  http.get('/v1/team/members', () => {
    return HttpResponse.json(FIXTURE_TEAM_MEMBERS);
  }),

  http.post('/v1/team/invitations', () => {
    return HttpResponse.json({
      success: true,
      member: { id: 'new-invite', status: 'invited' },
    });
  }),

  http.get('/v1/audit', () => {
    return HttpResponse.json({
      items: FIXTURE_AUDIT_ROWS,
      total: FIXTURE_AUDIT_ROWS.length,
      nextCursor: null,
    });
  }),

  http.get('/v1/audit/export', () => {
    const rows = FIXTURE_AUDIT_ROWS.map((row) =>
      [
        row.timestamp,
        row.actorName,
        row.actorRole,
        row.subject,
        row.subjectId,
        row.action,
        row.decision,
        row.reason ?? '',
      ].join(','),
    );
    const csv = ['timestamp,actor,role,subject,subjectId,action,decision,reason', ...rows].join(
      '\n',
    );
    return new HttpResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit.csv"' },
    });
  }),
];
