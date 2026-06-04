import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-brand hover:bg-brand-soft',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        outline: 'border border-line bg-surface hover:bg-canvas text-default',
        secondary: 'bg-brand-fade text-brand hover:bg-brand-fade/80',
        ghost: 'hover:bg-canvas text-default hover:text-default',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-space-4 py-space-2',
        sm: 'h-8 rounded-md px-space-3 text-small',
        lg: 'h-10 rounded-md px-space-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
