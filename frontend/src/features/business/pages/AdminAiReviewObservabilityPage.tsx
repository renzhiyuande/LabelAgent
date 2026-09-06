import { AiReviewObservabilityBoard } from "@/features/business/components/AiReviewObservabilityBoard";

export function AdminAiReviewObservabilityPage() {
  return (
    <AiReviewObservabilityBoard
      scope="admin"
      title="平台 AI 审核大屏"
      description="查看全平台 AI 审核队列、吞吐趋势、模型分布、TopK 异常与完整执行明细。"
      showSensitive
    />
  );
}
