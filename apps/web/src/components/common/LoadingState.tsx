import { Skeleton } from '@/components/ui/skeleton';

type LoadingVariant = 'card-skeleton' | 'table-skeleton' | 'list-skeleton';

interface LoadingStateProps {
  variant?: LoadingVariant;
}

function CardSkeleton() {
  return (
    <div className="space-y-space-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-space-6">
          <Skeleton className="h-4 w-32 mb-space-3" />
          <Skeleton className="h-8 w-20 mb-space-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-space-2">
      <Skeleton className="h-9 w-full rounded-md" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-space-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-space-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-space-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ variant = 'card-skeleton' }: LoadingStateProps) {
  if (variant === 'table-skeleton') return <TableSkeleton />;
  if (variant === 'list-skeleton') return <ListSkeleton />;
  return <CardSkeleton />;
}
