export {
  AiInsightPanel,
  AI_INSIGHT_STATUS_META,
  buildMockAiInsight,
  type AiDimensionScore,
  type AiInsight,
} from "@/components/workbench/shared/AiInsightPanel";

export { AiInsightPanel as LabelerAiInsightPanel } from "@/components/workbench/shared/AiInsightPanel";

export type LabelerAiDimensionScore = import("@/components/workbench/shared/AiInsightPanel").AiDimensionScore;
export type LabelerAiInsight = import("@/components/workbench/shared/AiInsightPanel").AiInsight;
