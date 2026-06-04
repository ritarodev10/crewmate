import { cn } from '@/lib/cn';

type StatusVariant =
  | 'scheduled'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'delivered'
  | 'retrying'
  | 'failed';

const STATUS_STYLES: Record<StatusVariant, string> = {
  scheduled: 'bg-info-fade text-info',
  en_route: 'bg-warn-fade text-warn',
  in_progress: 'bg-accent-fade text-accent',
  completed: 'bg-success-fade text-success',
  cancelled: 'bg-danger-fade text-danger',
  delivered: 'bg-success-fade text-success',
  retrying: 'bg-warn-fade text-warn',
  failed: 'bg-danger-fade text-danger',
};

const STATUS_LABELS: Record<StatusVariant, string> = {
  scheduled: 'Scheduled',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  delivered: 'Delivered',
  retrying: 'Retrying',
  failed: 'Failed',
};

interface StatusPillProps {
  status: StatusVariant;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-space-2 py-space-1 rounded-sm text-micro uppercase tracking-[0.05em] font-semibold',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
