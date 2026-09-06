import { formatFieldValue } from "../../utils/formatters";
import type { DetailSectionSchema, OptionItem, RemoteOptionQuery, ResourceMeta, TableColumnLinkMeta } from "../../schema/types";
import { getValueAtPath } from "../../utils/object-path";
import { hasPermission } from "../../utils/permissions";
import type { AuthenticatedUser } from "../../lib/types";
import { renderDetailFieldValue, type DetailFieldDisplayCallbacks } from "../../utils/detail-field-display";
import { findFormFieldForDetail, getDetailFieldOptionKey } from "../../utils/detail-field-options";
import {
  resolvePreviewTagClassName,
  resolvePreviewTagLabel,
} from "../../utils/dict-tag-style";
import { getDetailFieldComponent } from "../detail/registry";
import { LHDetailOptionLoadHint } from "./LHDetailOptionLoadHint";
import { LHDetailRemoteSchemaView } from "./LHDetailRemoteSchemaView";
import { LHDetailTimeline } from "./LHDetailTimeline";
import { LHDetailTimelineGroup } from "./LHDetailTimelineGroup";
import { shouldRenderDetailAsRemoteSchema } from "../../utils/detail-remote-schema";

type DetailField = DetailSectionSchema["fields"][number];

function renderDetailField(
  field: DetailField,
  displayRecord: Record<string, unknown>,
  currentUser: AuthenticatedUser | null,
  resource: ResourceMeta | undefined,
  dictOptions: Record<string, OptionItem[]>,
  fieldOptions: Record<string, OptionItem[]>,
  fieldOptionErrors: Record<string, string>,
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
  detailFieldCallbacks?: DetailFieldDisplayCallbacks,
) {
  if (!hasPermission(currentUser, field.permission)) {
    return null;
  }
  const rawValue = getValueAtPath(displayRecord, field.path ?? field.key);

  // 自定义组件优先：若通过 registerDetailFieldComponent 注册了对应 type，直接渲染
  const CustomComponent = getDetailFieldComponent(field.type);
  if (CustomComponent) {
    return <CustomComponent key={field.key} field={field} rawValue={rawValue} displayRecord={displayRecord} />;
  }
  if (shouldRenderDetailAsRemoteSchema(resource, field)) {
    return (
      <LHDetailRemoteSchemaView
        key={field.key}
        field={field}
        displayRecord={displayRecord}
        resource={resource}
        dictOptions={dictOptions}
        fieldOptions={fieldOptions}
        variant="grid"
      />
    );
  }
  if (field.type === "timeline") {
    return <LHDetailTimeline key={field.key} field={field} rawValue={rawValue} />;
  }
  if (field.type === "timelineGroup") {
    return <LHDetailTimelineGroup key={field.key} field={field} rawValue={rawValue} />;
  }
  if (field.type === "json") {
    return (
      <details className="lh-detail-json-block" key={field.key}>
        <summary className="lh-field-label">{field.label || "原始 JSON"}</summary>
        <pre className="lh-detail-json-pre">{formatFieldValue(field, rawValue)}</pre>
      </details>
    );
  }
  if (field.type === "dictTagPreview") {
    const label = resolvePreviewTagLabel(getValueAtPath(displayRecord, "itemLabel"));
    const tagClassName = resolvePreviewTagClassName(
      getValueAtPath(displayRecord, "tone"),
      getValueAtPath(displayRecord, "className"),
    );
    return (
      <div className="lh-detail-item lh-detail-item--full" key={field.key}>
        <span className="lh-field-label">{field.label}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className={tagClassName}>{label}</span>
          <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {tagClassName}
          </code>
        </div>
      </div>
    );
  }
  const optionKey = getDetailFieldOptionKey(field);
  const valueNode = renderDetailFieldValue(
    field,
    rawValue,
    resource,
    dictOptions,
    findFormFieldForDetail(resource, field),
    fieldOptions[optionKey],
    displayRecord,
    detailFieldCallbacks,
  );
  const wrapValueInStrong =
    field.type !== "link" || field.link?.action !== "openRelated";

  return (
    <div className="lh-detail-item" key={field.key}>
      <span className="lh-field-label">{field.label}</span>
      <div className="lh-detail-item-value">
        {wrapValueInStrong ? <strong>{valueNode}</strong> : valueNode}
        <LHDetailOptionLoadHint message={fieldOptionErrors[optionKey]} />
      </div>
    </div>
  );
}

interface LHDetailGridViewProps {
  sections: DetailSectionSchema[];
  displayRecord: Record<string, unknown>;
  currentUser: AuthenticatedUser | null;
  resource?: ResourceMeta;
  dictOptions?: Record<string, OptionItem[]>;
  fieldOptions?: Record<string, OptionItem[]>;
  fieldOptionErrors?: Record<string, string>;
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
  onOpenRelated?: (record: Record<string, unknown>, link: TableColumnLinkMeta) => void;
  onNavigate?: (href: string, openInNewTab?: boolean) => void;
}

export function LHDetailGridView({
  sections,
  displayRecord,
  currentUser,
  resource,
  dictOptions = {},
  fieldOptions = {},
  fieldOptionErrors = {},
  loadRemoteOptions,
  onOpenRelated,
  onNavigate,
}: LHDetailGridViewProps) {
  const detailFieldCallbacks: DetailFieldDisplayCallbacks | undefined =
    onOpenRelated || onNavigate ? { onOpenRelated, onNavigate } : undefined;

  return (
    <div className="lh-detail-content">
      {sections.map((section) => (
        <section className="lh-detail-section" key={section.key}>
          {section.title ? <h3>{section.title}</h3> : null}
          <div
            className={
              section.fields.some((field) =>
                field.type === "timeline" || field.type === "timelineGroup" || getDetailFieldComponent(field.type) != null,
              )
                ? "lh-detail-stack"
                : "lh-detail-grid"
            }
          >
            {section.fields.map((field) =>
              renderDetailField(
                field,
                displayRecord,
                currentUser,
                resource,
                dictOptions,
                fieldOptions,
                fieldOptionErrors,
                loadRemoteOptions,
                detailFieldCallbacks,
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
