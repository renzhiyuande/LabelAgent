"use client";

import type { FormFieldSchema } from "../../../schema/types";
import {
  buildShowItemTableRows,
  expandShowItemAssetTokens,
  formatShowItemDisplayText,
  highlightJsonHtml,
  renderShowItemMarkdown,
  resolveShowItemRawContent,
  resolveShowItemRenderAs,
  sanitizeShowItemHtml,
  clampShowItemDisplayHeight,
  resolveShowItemHeightMode,
  shouldUseShowItemPre,
  SHOW_ITEM_MARKDOWN_PROSE_CLASS,
} from "../show-item-utils";
import { ShowItemAutoDisplayShell } from "./ShowItemAutoDisplayShell";
import { ShowItemRichHtmlView } from "./ShowItemRichHtmlView";

interface ShowItemFieldControlProps {
  field?: FormFieldSchema;
  value: unknown;
  formatter?: string;
  displayType?: string;
  formValues?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  /** 是否应用 showItem 高度策略；设计器画布编辑预览传 false */
  constrainHeight?: boolean;
}

const displayShellClass =
  "lh-show-item-display w-full rounded-md border border-border/80 bg-muted/40 p-2";

function ShowItemInlineText({ text }: { text: string }) {
  return (
    <p className="lh-show-item-inline text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
      {text}
    </p>
  );
}

function ShowItemCodeBlock({
  text,
  highlightJson = false,
  embedded = false,
}: {
  text: string;
  highlightJson?: boolean;
  embedded?: boolean;
}) {
  const code = highlightJson ? (
    <code dangerouslySetInnerHTML={{ __html: highlightJsonHtml(text) }} />
  ) : (
    <code>{text}</code>
  );

  if (embedded) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground">
        {code}
      </pre>
    );
  }

  return (
    <div className="lh-show-item-code overflow-hidden rounded-lg border border-border bg-muted">
      <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-5 text-foreground">
        {code}
      </pre>
    </div>
  );
}

function ShowItemTable({ rows }: { rows: Array<{ key: string; value: string }> }) {
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-b-0">
              <th className="whitespace-nowrap bg-muted px-3 py-2 text-left font-medium text-muted-foreground">
                {row.key}
              </th>
              <td className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-foreground">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShowItemBody({
  field,
  raw,
  embedded = false,
}: {
  field?: FormFieldSchema;
  raw: unknown;
  embedded?: boolean;
}) {
  const renderAs = field ? resolveShowItemRenderAs(field) : "text";
  const layout = field?.showItem?.layout ?? (renderAs === "json" ? "pre" : "inline");
  const formatted = field ? formatShowItemDisplayText(field, raw) : String(raw ?? "-");

  if (formatted === "-" || formatted === "") {
    return <p className="lh-detail-empty-hint">暂无数据</p>;
  }

  if (layout === "table") {
    return <ShowItemTable rows={buildShowItemTableRows(raw)} />;
  }

  const withAssets = expandShowItemAssetTokens(formatted, renderAs);

  if (renderAs === "html") {
    const html = sanitizeShowItemHtml(withAssets);
    return <ShowItemRichHtmlView className={SHOW_ITEM_MARKDOWN_PROSE_CLASS} html={html} />;
  }

  if (renderAs === "markdown") {
    const html = sanitizeShowItemHtml(renderShowItemMarkdown(withAssets));
    return <ShowItemRichHtmlView className={SHOW_ITEM_MARKDOWN_PROSE_CLASS} html={html} />;
  }

  if (field && shouldUseShowItemPre(field)) {
    return <ShowItemCodeBlock text={formatted} highlightJson={renderAs === "json"} embedded={embedded} />;
  }

  return <ShowItemInlineText text={formatted} />;
}

export function ShowItemFieldControl({
  field,
  value,
  formatter,
  displayType,
  formValues,
  payload,
  constrainHeight = true,
}: ShowItemFieldControlProps) {
  const effectiveField: FormFieldSchema | undefined =
    field ??
    ({
      key: "showItem",
      label: "",
      component: "showItem",
      formatter,
      displayType,
    } as FormFieldSchema);

  const raw = resolveShowItemRawContent(effectiveField, {
    boundValue: value,
    formValues,
    payload,
  });

  const layout = effectiveField.showItem?.layout ?? "inline";
  const heightMode = resolveShowItemHeightMode(effectiveField);
  const rawMaxHeight = effectiveField.showItem?.maxHeight;
  const fixedHeight =
    constrainHeight &&
    heightMode === "fixed" &&
    rawMaxHeight != null &&
    rawMaxHeight > 0
      ? clampShowItemDisplayHeight(rawMaxHeight)
      : undefined;

  const inDisplayShell = constrainHeight;
  const body = <ShowItemBody field={effectiveField} raw={raw} embedded={inDisplayShell} />;

  let content =
    layout === "card" ? (
      <div className="rounded-lg border border-border bg-muted/70 p-3">
        {body}
      </div>
    ) : (
      body
    );

  if (!constrainHeight) {
    return content;
  }

  const measureKey = `${effectiveField.key}:${String(raw ?? "")}`;

  if (fixedHeight != null) {
    return (
      <div
        className={`${displayShellClass} lh-show-item-display--fixed min-h-0 overflow-y-auto overscroll-contain`}
        style={{ height: fixedHeight }}
      >
        {content}
      </div>
    );
  }

  return <ShowItemAutoDisplayShell measureKey={measureKey}>{content}</ShowItemAutoDisplayShell>;
}
