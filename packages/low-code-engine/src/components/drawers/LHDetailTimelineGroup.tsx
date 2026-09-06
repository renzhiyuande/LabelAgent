import { AuditTimeline } from "../../adapters/asset-adapter";
import type { DetailFieldSchema } from "../../schema/types";
import { toTimelineEntries } from "./LHDetailTimeline";

interface LHDetailTimelineGroupProps {
  field: DetailFieldSchema;
  rawValue: unknown;
}

export function resolveGroupTitle(group: Record<string, unknown>, index: number): string {
  const recordTitle = group.recordTitle ?? group.title;
  if (recordTitle != null && String(recordTitle).trim()) {
    return String(recordTitle).trim();
  }
  const seqNo = group.itemSeqNo;
  const sourceItemKey = group.sourceItemKey;
  if (seqNo != null && sourceItemKey != null && String(sourceItemKey).trim()) {
    return `题目 #${seqNo} · ${String(sourceItemKey).trim()}`;
  }
  if (seqNo != null) {
    return `题目 #${seqNo}`;
  }
  return `记录 ${index + 1}`;
}

export function resolveGroupKey(group: Record<string, unknown>, index: number): string {
  if (group.assignmentId != null) {
    return `assignment-${String(group.assignmentId)}`;
  }
  if (group.submissionId != null) {
    return `submission-${String(group.submissionId)}`;
  }
  return `record-${index}`;
}

export function LHDetailTimelineGroup({ field, rawValue }: LHDetailTimelineGroupProps) {
  const groups = Array.isArray(rawValue) ? rawValue : [];
  const timelineTitle = field.label?.trim() ? field.label : undefined;

  if (groups.length === 0) {
    return (
      <div className="lh-detail-item lh-detail-item--full" key={field.key}>
        {timelineTitle ? <span className="lh-field-label">{timelineTitle}</span> : null}
        <p className="text-sm text-muted-foreground">暂无提交记录</p>
      </div>
    );
  }

  return (
    <div className="lh-detail-item lh-detail-item--full lh-detail-timeline-group" key={field.key}>
      {timelineTitle ? <span className="lh-field-label">{timelineTitle}</span> : null}
      <div className="mt-3 space-y-5">
        {groups.map((item, index) => {
          const group = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const entries = toTimelineEntries(group.entries);
          return (
            <AuditTimeline
              key={resolveGroupKey(group, index)}
              title={resolveGroupTitle(group, index)}
              entries={entries}
            />
          );
        })}
      </div>
    </div>
  );
}
