'use client';
import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from './sheet';
import { cn } from '@/lib/cn';
import { motionBase } from '@/lib/motion';

export { motionBase };

interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Drawer({ open, onOpenChange, children }: DrawerProps) {
  return (
    <Sheet
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
    >
      {children}
    </Sheet>
  );
}

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, width = 'sm:max-w-[480px]', children, ...props }, ref) => (
    <SheetContent
      side="right"
      className={cn('flex flex-col', width, className)}
      ref={ref}
      {...(props as React.ComponentPropsWithoutRef<typeof SheetContent>)}
    >
      {children}
    </SheetContent>
  ),
);
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = SheetHeader;
const DrawerTitle = SheetTitle;
const DrawerDescription = SheetDescription;
const DrawerClose = SheetClose;
const DrawerFooter = SheetFooter;

export {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
};
