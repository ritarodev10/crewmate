import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  description: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon: Icon, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-4 py-space-16 text-center">
      <Icon size={48} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
      <div className="space-y-space-2">
        <h3 className="text-h3 text-default font-semibold">{heading}</h3>
        <p className="text-body text-muted max-w-sm">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
