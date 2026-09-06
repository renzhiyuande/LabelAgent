import { AiReviewObservabilityBoard } from "@/features/business/components/AiReviewObservabilityBoard";

export function OwnerAiReviewObservabilityPage() {
  return (
    <AiReviewObservabilityBoard
      scope="owner"
      title="我的 AI 审核大屏"
      description="查看自己创建任务范围内的 AI 审核运行状态、吞吐趋势与基础执行记录。"
      showSensitive={false}
    />
  );
}
