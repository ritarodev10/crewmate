import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorScope = 'card' | 'page';

interface ErrorStateProps {
  scope?: ErrorScope;
  error: unknown;
  onRetry?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
}

export function ErrorState({ scope = 'card', error, onRetry }: ErrorStateProps) {
  const message = getErrorMessage(error);

  const isPage = scope === 'page';

  return (
    <div
      className={
        isPage
          ? 'flex flex-col items-center justify-center gap-space-4 py-space-16 text-center'
          : 'flex flex-col items-center justify-center gap-space-3 py-space-8 text-center'
      }
    >
      <AlertCircle
        size={isPage ? 48 : 32}
        strokeWidth={1.5}
        className="text-danger"
        aria-hidden="true"
      />
      <div className="space-y-space-1">
        <h3 className="text-h3 text-default font-semibold">Something went wrong</h3>
        <p className="text-body text-muted max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
