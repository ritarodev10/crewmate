// System roles. See nestjs-ai-guardrails/09-RBAC.md for the full model.
export const SystemRole = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  COORDINATOR: 'coordinator',
  WORKER: 'worker',
} as const;
export type SystemRoleName = (typeof SystemRole)[keyof typeof SystemRole];

// A scope narrows which slice of the tenant's data a grant applies to.
export type ScopeRef =
  | { kind: 'tenant' }
  | { kind: 'region'; regionId: string }
  | { kind: 'properties'; propertyIds: string[] };

export interface RoleGrant {
  id: string;
  userId: string;
  operatorId: string;
  role: SystemRoleName | string; // string supports custom roles in v0.2
  scope: ScopeRef;
  grantedBy: string;
  grantedAt: string; // ISO 8601
  expiresAt: string | null;
}
