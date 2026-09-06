"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

interface LHTableEllipsisCellProps {
  text: string;
  /** 表格内可见行数，默认 2 */
  lines?: 1 | 2;
}

export function LHTableEllipsisCell({ text, lines = 2 }: LHTableEllipsisCellProps) {
  if (!text || text === "-") {
    return <span className="lh-table-ellipsis lh-table-ellipsis--empty">-</span>;
  }

  const lineClass = lines === 1 ? "lh-table-ellipsis--lines-1" : "lh-table-ellipsis--lines-2";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`lh-table-ellipsis ${lineClass}`}
            tabIndex={0}
            title={text}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={6}
          className="lh-table-ellipsis-tooltip max-w-md whitespace-pre-wrap border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
