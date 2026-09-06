import type { FormSchema } from "@/low-code/schema/types";
import type { LabelerWorkbenchViewMode } from "../../LabelerSlotFrame";

export interface PayloadPanelProps {
  viewMode: LabelerWorkbenchViewMode;
  payload: Record<string, unknown>;
  displaySchema: FormSchema;
  taskName: string;
  seqNo?: number;
  sceneCode?: string;
  lastReviewComment?: string | null;
  pending?: boolean;
}

export interface PayloadPanelBodyProps {
  payload: Record<string, unknown>;
  displaySchema: FormSchema;
  displayValues: Record<string, unknown>;
  flatDisplayFields: FormSchema["sections"][number]["fields"];
  hasTemplateDisplay: boolean;
  hasPayload: boolean;
}
