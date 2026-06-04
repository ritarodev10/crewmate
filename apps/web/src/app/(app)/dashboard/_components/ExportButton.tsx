'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ExportButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="default" disabled>
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Export PDF</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Coming in v0.2</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
