import { useMemo } from "react";
import { buildDisplayValuesFromPayload } from "../../work/utils/build-display-values";
import { collectTemplateDisplayFields } from "./payload/payload-display-fields";
import { LabelerWorkContentShell } from "./LabelerWorkContentShell";
import { LabelerPanelScrollArea } from "./LabelerPanelScrollArea";
import { PayloadPanelForm } from "./payload/PayloadPanelForm";
import { PayloadPanelHeader } from "./payload/PayloadPanelHeader";
import { PayloadPanelInlineTable } from "./payload/PayloadPanelInlineTable";
import { PayloadPanelJson } from "./payload/PayloadPanelJson";
import { PayloadPanelReviewBanner } from "./payload/PayloadPanelReviewBanner";
import type { PayloadPanelBodyProps, PayloadPanelProps } from "./payload/types";

function renderPayloadBody(viewMode: PayloadPanelProps["viewMode"], body: PayloadPanelBodyProps) {
  switch (viewMode) {
    case "json":
      return <PayloadPanelJson payload={body.payload} hasPayload={body.hasPayload} />;
    case "cards":
      return <PayloadPanelForm {...body} />;
    case "inline":
    default:
      return <PayloadPanelInlineTable {...body} />;
  }
}

export function LabelerPayloadPanel({
  viewMode,
  payload,
  displaySchema,
  taskName,
  seqNo,
  sceneCode,
  lastReviewComment,
  pending = false,
}: PayloadPanelProps) {
  const displayValues = useMemo(() => buildDisplayValuesFromPayload(displaySchema, payload), [displaySchema, payload]);

  const flatDisplayFields = useMemo(() => collectTemplateDisplayFields(displaySchema), [displaySchema]);

  const bodyProps: PayloadPanelBodyProps = {
    payload,
    displaySchema,
    displayValues,
    flatDisplayFields,
    hasTemplateDisplay: flatDisplayFields.length > 0,
    hasPayload: Object.keys(payload).length > 0,
  };

  return (
    <LabelerWorkContentShell
      pending={pending}
      className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,hsl(var(--background)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]"
    >
      <PayloadPanelHeader taskName={taskName} seqNo={seqNo} sceneCode={sceneCode} />

      <LabelerPanelScrollArea contentClassName="space-y-3 p-3">
        {lastReviewComment ? <PayloadPanelReviewBanner comment={lastReviewComment} /> : null}
        {renderPayloadBody(viewMode, bodyProps)}
      </LabelerPanelScrollArea>
    </LabelerWorkContentShell>
  );
}
