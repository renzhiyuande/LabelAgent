import { LabelerSlotFrame } from "../LabelerSlotFrame";
import { LabelerSlotWidgetBoard } from "../chrome/LabelerSlotWidgetBoard";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

export function AnnotateSlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  return (
    <LabelerSlotFrame
      slotId="annotate"
      title="作答区"
      description="各组件可单独切换显示方式；默认上下分布表单与提交操作。"
      env={env}
      controls={context}
      suppressViewMode
    >
      <LabelerSlotWidgetBoard boardId="annotate" context={context} />
    </LabelerSlotFrame>
  );
}
