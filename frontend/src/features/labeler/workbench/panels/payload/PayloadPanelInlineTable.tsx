import { buildPayloadSectionTableGroups } from "./build-payload-table-rows";
import { PayloadTableValueCell } from "./PayloadTableValueCell";
import type { PayloadPanelBodyProps } from "./types";

function PayloadEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

function PayloadInlineTable({ rows }: { rows: { binding: string; label: string; raw: unknown }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card/90">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.binding}
                className="border-b border-border/60 last:border-b-0"
              >
                <td className="max-w-[10rem] px-3 py-2.5 align-top font-medium text-foreground">
                  {row.label}
                </td>
                <td className="min-w-0 px-3 py-2.5 align-top">
                  <PayloadTableValueCell value={row.raw} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PayloadPanelInlineTable(props: PayloadPanelBodyProps) {
  const { hasPayload, hasTemplateDisplay } = props;

  if (!hasPayload && !hasTemplateDisplay) {
    return <PayloadEmptyState message="本题暂无导入数据" />;
  }

  const sectionGroups = buildPayloadSectionTableGroups(props);

  if (sectionGroups.length === 0) {
    return <PayloadEmptyState message="本题暂无导入数据" />;
  }

  return (
    <div className="space-y-4">
      {sectionGroups.map((group) => (
        <div key={group.sectionKey} className="space-y-2">
          {group.title ? (
            <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
          ) : null}
          <PayloadInlineTable rows={group.rows} />
        </div>
      ))}
    </div>
  );
}
