"use client";

import type { ReactNode } from "react";
import type { AssignmentSummaryField } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import { resolveAssignmentSummary } from "../../utils/assignment-summary";
import { LHAssignmentSummaryCard } from "./LHAssignmentSummaryCard";

interface LHAssignmentWorkspaceProps {
  record: ResourceRecord;
  summary?: AssignmentSummaryField[];
  targetTitle?: string;
  targetDescription?: string;
  children: ReactNode;
}

/** 分配类操作的通用布局：左侧对象摘要 + 右侧表单/选择区 */
export function LHAssignmentWorkspace({
  record,
  summary = [],
  targetTitle,
  targetDescription,
  children,
}: LHAssignmentWorkspaceProps) {
  const summaryItems = resolveAssignmentSummary(record, summary);
  const hasSummary = summaryItems.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {hasSummary ? (
        <LHAssignmentSummaryCard
          items={summaryItems}
          title={targetTitle}
          description={targetDescription}
        />
      ) : null}
      <div className={hasSummary ? undefined : "lg:col-span-2"}>{children}</div>
    </div>
  );
}
