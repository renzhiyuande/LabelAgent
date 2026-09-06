import type { AssignmentSummaryField } from "../schema/types";
import type { ResourceRecord } from "../types";

export interface AssignmentSummaryItem {
  label: string;
  value: string;
}

export function resolveAssignmentSummary(
  record: ResourceRecord,
  fields: AssignmentSummaryField[] = [],
): AssignmentSummaryItem[] {
  return fields.map((item) => ({
    label: item.label,
    value: String(record[item.field] ?? "-"),
  }));
}
