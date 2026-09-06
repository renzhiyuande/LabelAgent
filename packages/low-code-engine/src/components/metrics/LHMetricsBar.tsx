import type { MetricsSchema } from "../../schema/types";
import type { ResourceRecord } from "../../types";

interface LHMetricsBarProps {
  schema?: MetricsSchema;
  records: ResourceRecord[];
}

export function LHMetricsBar({ schema, records }: LHMetricsBarProps) {
  if (!schema?.items.length || records.length === 0) {
    return null;
  }
  const sample = records[0];
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {schema.items.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-sm shadow-sm"
        >
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {String(sample[item.field] ?? "-")}
          </div>
        </div>
      ))}
    </div>
  );
}
