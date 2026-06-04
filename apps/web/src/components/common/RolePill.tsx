import { cn } from '@/lib/cn';

type RoleVariant = 'tenant_admin' | 'coordinator' | 'worker' | 'custom' | 'invited';

const ROLE_STYLES: Record<RoleVariant, string> = {
  tenant_admin: 'bg-brand-fade text-brand',
  coordinator: 'bg-info-fade text-info',
  worker: 'bg-success-fade text-success',
  custom: 'bg-accent-fade text-accent',
  invited: 'bg-line text-muted',
};

const ROLE_LABELS: Record<RoleVariant, string> = {
  tenant_admin: 'Admin',
  coordinator: 'Coordinator',
  worker: 'Worker',
  custom: 'Custom',
  invited: 'Invited',
};

interface RolePillProps {
  role: RoleVariant;
  customRoleName?: string;
  className?: string;
}

export function RolePill({ role, customRoleName, className }: RolePillProps) {
  const label =
    role === 'custom' && customRoleName ? customRoleName : ROLE_LABELS[role];

  return (
    <span
      className={cn(
        'inline-flex items-center px-space-2 py-space-1 rounded-sm text-micro uppercase tracking-[0.05em] font-semibold',
        ROLE_STYLES[role],
        className,
      )}
    >
      {label}
    </span>
  );
}
