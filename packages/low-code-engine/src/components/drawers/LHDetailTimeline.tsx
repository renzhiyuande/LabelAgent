import { AuditTimeline, type AuditTimelineEntry } from "../../adapters/asset-adapter";
import type { DetailFieldSchema } from "../../schema/types";
import { formatFieldValue } from "../../utils/formatters";

export function toTimelineEntries(rawValue: unknown): AuditTimelineEntry[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.map((item, index) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const tone = record.tone;
    return {
      id: String(record.id ?? index),
      stage: String(record.stage ?? record.category ?? "EVENT"),
      label: String(record.label ?? "事件"),
      detail: record.detail != null ? String(record.detail) : undefined,
      timestamp: formatFieldValue({ type: "datetime" }, record.occurredAt),
      tone:
        tone === "success" || tone === "warning" || tone === "destructive" || tone === "default"
          ? tone
          : "default",
    };
  });
}

interface LHDetailTimelineProps {
  field: DetailFieldSchema;
  rawValue: unknown;
}

export function LHDetailTimeline({ field, rawValue }: LHDetailTimelineProps) {
  const entries = toTimelineEntries(rawValue);
  const timelineTitle = field.label?.trim() ? field.label : undefined;
  if (entries.length === 0) {
    return (
      <div className="lh-detail-item lh-detail-item--full" key={field.key}>
        {timelineTitle ? <span className="lh-field-label">{timelineTitle}</span> : null}
        <p className="text-sm text-slate-500">暂无记录</p>
      </div>
    );
  }
  return (
    <div className="lh-detail-item lh-detail-item--full" key={field.key}>
      <AuditTimeline
        title={timelineTitle}
        entries={entries}
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );
}
