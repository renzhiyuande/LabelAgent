export type ReviewWorkflowAction = "approve" | "reject" | "return";

export interface ReviewWorkflowLevelItem {
  key: string;
  label: string;
  actions: ReviewWorkflowAction[];
}

export const REVIEW_WORKFLOW_ACTION_OPTIONS: Array<{ id: ReviewWorkflowAction; label: string }> = [
  { id: "approve", label: "通过" },
  { id: "reject", label: "驳回" },
  { id: "return", label: "退回修改" },
];

export const DEFAULT_REVIEW_WORKFLOW_LEVELS: ReviewWorkflowLevelItem[] = [
  { key: "L1", label: "初审", actions: ["approve", "reject", "return"] },
];
