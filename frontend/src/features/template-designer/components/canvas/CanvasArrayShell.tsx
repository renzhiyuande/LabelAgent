"use client";

import { ArrowLeft, ArrowRightCircle, Layers } from "lucide-react";
import type { FormFieldSchema } from "@/low-code/schema/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CanvasArrayShellProps {
  field: FormFieldSchema;
  variant: "main" | "sub";
  selected?: boolean;
  children?: React.ReactNode;
  onEnterSubCanvas?: () => void;
  onExitSubCanvas?: () => void;
  onSelectParent?: () => void;
}

function ArrayChildSummary({ fields }: { fields: FormFieldSchema[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">暂无子字段，进入子画布后可拖拽添加</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {fields.map((child) => (
        <li
          key={child.key}
          className="flex items-center justify-between gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{child.label}</span>
          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
            {child.component}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function CanvasArrayShell({
  field,
  variant,
  selected = false,
  children,
  onEnterSubCanvas,
  onExitSubCanvas,
  onSelectParent,
}: CanvasArrayShellProps) {
  const childFields = field.fields ?? [];
  const isSub = variant === "sub";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-900",
        isSub
          ? selected
            ? "border-blue-500 shadow-lg shadow-blue-100 dark:border-blue-400 dark:shadow-blue-950"
            : "border-violet-200 dark:border-violet-900/60"
          : "border-violet-200/80 dark:border-violet-900/50",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          isSub
            ? "border-violet-100 bg-violet-50/90 dark:border-violet-900/40 dark:bg-violet-950/30"
            : "border-violet-100/80 bg-violet-50/60 dark:border-violet-900/30 dark:bg-violet-950/20",
        )}
        onClick={(event) => {
          if (!isSub) {
            return;
          }
          event.stopPropagation();
          onSelectParent?.();
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {field.label}
                {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
              </span>
              <Badge variant="secondary" className="text-xs font-normal">
                array
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {childFields.length} 个子字段
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              key: {field.key}
              {field.path && field.path !== field.key ? ` · path: ${field.path}` : ""}
            </p>
          </div>
        </div>

        {isSub ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={(event) => {
              event.stopPropagation();
              onExitSubCanvas?.();
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回主画布
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={(event) => {
              event.stopPropagation();
              onEnterSubCanvas?.();
            }}
          >
            <ArrowRightCircle className="mr-1.5 h-4 w-4" />
            进入子画布
          </Button>
        )}
      </div>

      <div className={cn("p-4", isSub && "min-h-[280px]")}>
        {isSub ? (
          children
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              子字段预览
            </p>
            <ArrayChildSummary fields={childFields} />
          </div>
        )}
      </div>
    </div>
  );
}
