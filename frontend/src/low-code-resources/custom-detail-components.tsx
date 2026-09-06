/**
 * LabelHub 自定义详情字段组件
 *
 * 通过 low-code 引擎的 registerDetailFieldComponent API 注册。
 * 这些组件替代引擎内置的「timeline」「timelineGroup」渲染路径，
 * 使用真实的 AuditTimeline 组件替代引擎内置的 stub。
 */
import { useMemo } from "react";
import type { DetailFieldComponentProps } from "@labelhub/low-code-engine";
import { formatFieldValue, renderShowItemMarkdown, sanitizeShowItemHtml } from "@labelhub/low-code-engine";
import {
  buildResourceMeta,
  cloneReadonlyFormSchema,
  fetchRemoteOptions,
  LHResourceForm,
  parseFormSchemaJson,
  resolveDetailTemplateFormMeta,
  resolveDetailTemplateFormValues,
  resolveGroupKey,
  resolveGroupTitle,
  toTimelineEntries,
} from "@labelhub/low-code-engine";
import { AuditTimeline } from "@/components/workbench/shared/AuditTimeline";
import { splitLabelerFormSchema } from "@/features/labeler/work/utils/split-labeler-schema";

/**
 * 分配记录 / 提价记录生命周期 timeline
 *
 * 接收 rawValue（SubmissionTimelineEntry[]），通过 toTimelineEntries 转换为
 * AuditTimelineEntry[] 后，渲染 AuditTimeline 组件。
 */
export function AuditTimelineDetailField({ field, rawValue }: DetailFieldComponentProps) {
  const entries = toTimelineEntries(rawValue);
  const timelineTitle = field.label?.trim() ? field.label : undefined;

  if (entries.length === 0) {
    return (
      <div className="lh-detail-item lh-detail-item--full">
        {timelineTitle ? <span className="lh-field-label">{timelineTitle}</span> : null}
        <p className="text-sm text-slate-500">暂无记录</p>
      </div>
    );
  }

  return (
    <div className="lh-detail-item lh-detail-item--full">
      <AuditTimeline
        title={timelineTitle}
        entries={entries}
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );
}

/**
 * 提交历史 timelineGroup
 *
 * 接收分组数据（如 submitHistories），每组的 entries 字段内包含生命周期事件列表。
 * 每个分组渲染为一个独立的 AuditTimeline。
 */
export function AuditTimelineGroupDetailField({ field, rawValue }: DetailFieldComponentProps) {
  const groups = Array.isArray(rawValue) ? rawValue : [];
  const timelineTitle = field.label?.trim() ? field.label : undefined;

  if (groups.length === 0) {
    return (
      <div className="lh-detail-item lh-detail-item--full">
        {timelineTitle ? <span className="lh-field-label">{timelineTitle}</span> : null}
        <p className="text-sm text-slate-500">暂无提交记录</p>
      </div>
    );
  }

  return (
    <div className="lh-detail-item lh-detail-item--full lh-detail-timeline-group">
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
              className="border-0 bg-transparent p-0 shadow-none"
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * 模板表单草稿只读展示
 *
 * 解析 record 中的模板 schema JSON，使用 splitLabelerFormSchema 拆分为
 * display/annotate 两部分，再由 LHResourceForm 只读渲染。
 */
export function TemplateFormDetailField({ field, displayRecord }: DetailFieldComponentProps) {
  const meta = useMemo(() => resolveDetailTemplateFormMeta(field), [field.templateForm]);
  const formSchema = useMemo(() => {
    const schemaJson = displayRecord[meta.schemaField];
    if (typeof schemaJson !== "string" || !schemaJson.trim()) return null;
    const parsed = parseFormSchemaJson(schemaJson);
    const split = splitLabelerFormSchema(parsed);
    const picked = meta.role === "display" ? split.displaySchema : split.annotateSchema;
    if (picked.sections.every((section) => section.fields.length === 0)) return parsed;
    return picked;
  }, [displayRecord, meta]);
  const values = useMemo(() => resolveDetailTemplateFormValues(displayRecord, meta), [displayRecord, meta]);
  const readonlySchema = useMemo(() => (formSchema ? cloneReadonlyFormSchema(formSchema) : null), [formSchema]);
  const formResource = useMemo(
    () =>
      readonlySchema
        ? buildResourceMeta(readonlySchema, field.label || "模板表单", `detail_${field.key}`)
        : null,
    [field.key, field.label, readonlySchema],
  );

  if (!formResource || !readonlySchema) {
    return (
      <div className="lh-detail-item lh-detail-item--full">
        <p className="lh-detail-empty-hint">暂无模板配置，无法渲染表单</p>
      </div>
    );
  }

  const hasFields = readonlySchema.sections.some((section) => section.fields.length > 0);
  if (!hasFields) {
    return (
      <div className="lh-detail-item lh-detail-item--full">
        <p className="lh-detail-empty-hint">当前模板未配置可展示字段</p>
      </div>
    );
  }

  const loadOptions = (source: string, query?: Parameters<typeof fetchRemoteOptions>[2]) =>
    fetchRemoteOptions(formResource, source, query);

  return (
    <div className="lh-detail-item lh-detail-item--full lh-detail-template-form-block">
      {field.label ? <span className="lh-field-label">{field.label}</span> : null}
      <div className="lh-detail-template-form">
        <LHResourceForm
          resource={formResource}
          mode="edit"
          values={values}
          formId={`detail-template-form-${field.key}`}
          variant={meta.role === "display" ? "labeler-display" : "labeler-annotate"}
          onChange={() => undefined}
          onSubmit={async () => undefined}
          loadRemoteOptions={loadOptions}
        />
      </div>
    </div>
  );
}

/**
 * 业务数据键值对展示（payloadMap）
 *
 * 将对象的 key-value 按字母序排列展示，用于查看题目/提交的业务负载数据。
 */
export function PayloadMapDetailField({ rawValue }: DetailFieldComponentProps) {
  if (rawValue == null || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return <p className="lh-detail-empty-hint">暂无业务数据</p>;
  }

  const entries = Object.entries(rawValue as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  if (entries.length === 0) {
    return <p className="lh-detail-empty-hint">暂无业务数据</p>;
  }

  return (
    <div className="lh-detail-payload-grid">
      {entries.map(([key, value]) => (
        <div className="lh-detail-payload-item" key={key}>
          <span className="lh-field-label">{key}</span>
          <pre className="lh-detail-payload-value">{formatPayloadValue(value)}</pre>
        </div>
      ))}
    </div>
  );
}

function formatPayloadValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

/**
 * 数组表格展示（arrayTable）
 *
 * 将数组数据渲染为表格，列定义来自 field.columns。
 */
export function ArrayTableDetailField({ field, rawValue }: DetailFieldComponentProps) {
  const items = Array.isArray(rawValue) ? rawValue : [];
  const columns = field.columns ?? [];

  if (columns.length === 0) {
    return <p className="lh-detail-empty-hint">未配置表格列</p>;
  }
  if (items.length === 0) {
    return <p className="lh-detail-empty-hint">暂无数据</p>;
  }

  return (
    <div className="lh-array-table-wrap lh-detail-array-table-wrap">
      <div className="lh-array-table-scroll">
        <table className="lh-array-table">
          <thead>
            <tr>
              <th className="lh-array-table-index-col">#</th>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const row =
                item && typeof item === "object" && !Array.isArray(item)
                  ? (item as Record<string, unknown>)
                  : {};
              return (
                <tr key={`${field.key}-${index}`}>
                  <td className="lh-array-table-index-col">{index + 1}</td>
                  {columns.map((column) => {
                    const cellValue = row[column.key];
                    const text = formatFieldValue({ type: column.type, formatter: column.formatter, enum: column.enum }, cellValue);
                    const isMultiline = text.includes("\n");
                    return (
                      <td key={column.key} className="lh-array-table-cell">
                        {isMultiline ? (
                          <span className="lh-array-table-cell-multiline" title={text}>
                            {text}
                          </span>
                        ) : (
                          <span className="lh-array-table-cell-text" title={text.length > 40 ? text : undefined}>
                            {text}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * ShowItem 内容展示（markdown / html / text）
 *
 * 用于 detail 页展示题目内容（题目说明、标注指引等 markdown 富文本）。
 * 替代引擎 fallback 路径的纯文本 + <strong> 包裹。
 */
export function ShowItemDetailField({ rawValue }: DetailFieldComponentProps) {
  const content = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");

  if (!content.trim()) {
    return <p className="lh-detail-empty-hint">暂无内容</p>;
  }

  // markdown → HTML → 安全渲染
  const html = sanitizeShowItemHtml(renderShowItemMarkdown(content));

  return (
    <div className="lh-detail-item lh-detail-item--full">
      <div
        className="lh-show-item-value prose prose-sm max-w-none dark:prose-invert
          [&_.lh-show-item-md-table]:w-full
          [&_.lh-show-item-md-table_th]:border [&_.lh-show-item-md-table_td]:border
          [&_.lh-show-item-md-table_th]:border-border [&_.lh-show-item-md-table_td]:border-border
          [&_.lh-show-item-md-table_th]:bg-muted [&_.lh-show-item-md-table_th]:px-3
          [&_.lh-show-item-md-table_th]:py-2 [&_.lh-show-item-md-table_td]:px-3
          [&_.lh-show-item-md-table_td]:py-2
          [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
