import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-space-2 py-space-1 text-micro font-semibold uppercase tracking-[0.05em] transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-brand',
        secondary: 'bg-brand-fade text-brand',
        destructive: 'bg-danger-fade text-danger',
        outline: 'border border-line text-default',
        success: 'bg-success-fade text-success',
        warn: 'bg-warn-fade text-warn',
        info: 'bg-info-fade text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
