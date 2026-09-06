interface AiQueueEmptyStateProps {
  message?: string;
}

export function AiQueueEmptyState({ message = "请从左侧选择一条预审记录" }: AiQueueEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">{message}</div>
  );
}
