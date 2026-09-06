"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import type { AssignmentSummaryItem } from "../../utils/assignment-summary";

interface LHAssignmentSummaryCardProps {
  items: AssignmentSummaryItem[];
  title?: string;
  description?: string;
}

export function LHAssignmentSummaryCard({
  items,
  title = "对象信息",
  description = "当前正在配置的目标对象。",
}: LHAssignmentSummaryCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
