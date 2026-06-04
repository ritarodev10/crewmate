import { cn } from '@/lib/cn';

const dotColors: Record<string, string> = {
  scheduled: 'bg-info',
  en_route: 'bg-warn',
  in_progress: 'bg-accent',
  completed: 'bg-success',
  cancelled: 'bg-danger',
  delivered: 'bg-success',
  retrying: 'bg-warn',
  failed: 'bg-danger',
};

interface StatusDotProps {
  status: string;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        dotColors[status] ?? 'bg-muted',
        className,
      )}
      aria-hidden="true"
    />
  );
}
