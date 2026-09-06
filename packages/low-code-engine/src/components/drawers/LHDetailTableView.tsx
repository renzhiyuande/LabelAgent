import { Fragment } from "react";
import { formatFieldValue } from "../../utils/formatters";
import type {
  DetailSectionSchema,
  OptionItem,
  RemoteOptionQuery,
  ResourceMeta,
  TableColumnLinkMeta,
} from "../../schema/types";
import { getValueAtPath } from "../../utils/object-path";
import { hasPermission } from "../../utils/permissions";
import type { AuthenticatedUser } from "../../lib/types";
import {
  renderDetailFieldValue,
  type DetailFieldDisplayCallbacks,
} from "../../utils/detail-field-display";
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

function LHDetailTableValueCell({
  field,
  rawValue,
  displayRecord,
  resource,
  dictOptions,
  fieldOptions,
  fieldOptionErrors,
  detailFieldCallbacks,
}: {
  field: DetailField;
  rawValue: unknown;
  displayRecord: Record<string, unknown>;
  resource?: ResourceMeta;
  dictOptions: Record<string, OptionItem[]>;
  fieldOptions: Record<string, OptionItem[]>;
  fieldOptionErrors: Record<string, string>;
  detailFieldCallbacks?: DetailFieldDisplayCallbacks;
}) {
  const optionKey = getDetailFieldOptionKey(field);
  const optionLoadError = fieldOptionErrors[optionKey];

  if (field.type === "json" || field.formatter === "json") {
    return (
      <pre className="lh-detail-table-json">{formatFieldValue(field, rawValue)}</pre>
    );
  }

  const formField = findFormFieldForDetail(resource, field);
  const rendered = renderDetailFieldValue(
    field,
    rawValue,
    resource,
    dictOptions,
    formField,
    fieldOptions[optionKey],
    displayRecord,
    detailFieldCallbacks,
  );

  const valueNode = typeof rendered !== "string"
    ? rendered
    : rendered.includes("\n")
      ? <pre className="lh-detail-table-multiline">{rendered}</pre>
      : <span className="lh-detail-table-text">{rendered}</span>;

  return (
    <>
      {valueNode}
      <LHDetailOptionLoadHint message={optionLoadError} />
    </>
  );
}

function renderDetailTableRow(
  field: DetailField,
  displayRecord: Record<string, unknown>,
  resource: ResourceMeta | undefined,
  dictOptions: Record<string, OptionItem[]>,
  fieldOptions: Record<string, OptionItem[]>,
  fieldOptionErrors: Record<string, string>,
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
  detailFieldCallbacks?: DetailFieldDisplayCallbacks,
) {
  const rawValue = getValueAtPath(displayRecord, field.path ?? field.key);

  // 自定义组件优先
  const CustomComponent = getDetailFieldComponent(field.type);
  if (CustomComponent) {
    return (
      <tr className="lh-detail-table-row lh-detail-table-row--full" key={field.key}>
        <td colSpan={2} className="lh-detail-table-payload-cell">
          <CustomComponent field={field} rawValue={rawValue} displayRecord={displayRecord} />
        </td>
      </tr>
    );
  }

  if (field.type === "timeline") {
    return (
      <tr className="lh-detail-table-row lh-detail-table-row--full" key={field.key}>
        <td colSpan={2} className="lh-detail-table-payload-cell">
          <LHDetailTimeline field={field} rawValue={rawValue} />
        </td>
      </tr>
    );
  }

  if (field.type === "timelineGroup") {
    return (
      <tr className="lh-detail-table-row lh-detail-table-row--full" key={field.key}>
        <td colSpan={2} className="lh-detail-table-payload-cell">
          <LHDetailTimelineGroup field={field} rawValue={rawValue} />
        </td>
      </tr>
    );
  }

  if (shouldRenderDetailAsRemoteSchema(resource, field)) {
    return (
      <LHDetailRemoteSchemaView
        field={field}
        displayRecord={displayRecord}
        resource={resource}
        dictOptions={dictOptions}
        fieldOptions={fieldOptions}
        variant="table"
      />
    );
  }

  if (field.type === "dictTagPreview") {
    const label = resolvePreviewTagLabel(getValueAtPath(displayRecord, "itemLabel"));
    const tagClassName = resolvePreviewTagClassName(
      getValueAtPath(displayRecord, "tone"),
      getValueAtPath(displayRecord, "className"),
    );
    return (
      <tr className="lh-detail-table-row lh-detail-table-row--full" key={field.key}>
        <td colSpan={2} className="lh-detail-table-payload-cell">
          {field.label ? <div className="lh-field-label lh-detail-table-payload-label">{field.label}</div> : null}
          <div className="flex flex-wrap items-center gap-3">
            <span className={tagClassName}>{label}</span>
            <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {tagClassName}
            </code>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="lh-detail-table-row" key={field.key}>
      <th scope="row" className="lh-detail-table-label">
        {field.label}
      </th>
      <td className="lh-detail-table-value">
        <LHDetailTableValueCell
          field={field}
          rawValue={rawValue}
          displayRecord={displayRecord}
          resource={resource}
          dictOptions={dictOptions}
          fieldOptions={fieldOptions}
          fieldOptionErrors={fieldOptionErrors}
          detailFieldCallbacks={detailFieldCallbacks}
        />
      </td>
    </tr>
  );
}

interface LHDetailTableViewProps {
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

export function LHDetailTableView({
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
}: LHDetailTableViewProps) {
  const detailFieldCallbacks =
    onOpenRelated || onNavigate ? { onOpenRelated, onNavigate } : undefined;
  return (
    <div className="lh-detail-content">
      {sections.map((section) => {
        const visibleFields = section.fields.filter((field) => hasPermission(currentUser, field.permission));
        if (visibleFields.length === 0) {
          return null;
        }

        return (
          <section className="lh-detail-section" key={section.key}>
            {section.title ? <h3>{section.title}</h3> : null}
            <div className="lh-detail-table-wrap">
              <table className="lh-detail-table">
                <tbody>
                  {visibleFields.map((field) => (
                    <Fragment key={field.key}>
                      {renderDetailTableRow(
                        field,
                        displayRecord,
                        resource,
                        dictOptions,
                        fieldOptions,
                        fieldOptionErrors,
                        loadRemoteOptions,
                        detailFieldCallbacks,
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
