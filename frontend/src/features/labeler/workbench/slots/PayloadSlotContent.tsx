import { LabelerSlotFrame } from "../LabelerSlotFrame";
import { LabelerSlotWidgetBoard } from "../chrome/LabelerSlotWidgetBoard";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

export function PayloadSlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  return (
    <LabelerSlotFrame
      slotId="payload"
      title="题面"
      description="题面与 AI 审核可并排；编辑布局时可拖到作答区或 AI 洞察。"
      env={env}
      controls={context}
      suppressViewMode
    >
      <LabelerSlotWidgetBoard boardId="payload" context={context} />
    </LabelerSlotFrame>
  );
}
