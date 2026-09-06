import { buildAnnotateSectionTableGroups } from "./build-annotate-table-rows";
import { PayloadTableValueCell } from "../payload/PayloadTableValueCell";
import type { FormSchema } from "@/low-code/schema/types";

function AnnotateEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

function AnnotateInlineTable({ rows }: { rows: { binding: string; label: string; raw: unknown }[] }) {
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

export function AnnotatePanelInlineTable({
  annotateSchema,
  values,
  fieldCount,
}: {
  annotateSchema: FormSchema;
  values: Record<string, unknown>;
  fieldCount: number;
}) {
  if (fieldCount === 0) {
    return (
      <AnnotateEmptyState message="当前模板未配置可编辑的标注字段。请在模板设计器中将需要填写的字段设置为「标注 / input」角色。" />
    );
  }

  const sectionGroups = buildAnnotateSectionTableGroups({ annotateSchema, values });

  if (sectionGroups.length === 0) {
    return <AnnotateEmptyState message="暂无作答字段" />;
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">表格为只读预览，切换到「卡片」视图可编辑。</p>
      {sectionGroups.map((group) => (
        <div key={group.sectionKey} className="space-y-2">
          {group.title ? (
            <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.title}
            </p>
          ) : null}
          <AnnotateInlineTable rows={group.rows} />
        </div>
      ))}
    </div>
  );
}
