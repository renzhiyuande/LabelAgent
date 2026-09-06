interface LHDetailOptionLoadHintProps {
  message?: string;
}

export function LHDetailOptionLoadHint({ message }: LHDetailOptionLoadHintProps) {
  if (!message) {
    return null;
  }

  return (
    <span className="lh-detail-empty-hint lh-detail-option-error" title={message}>
      选项加载失败，已显示原始值
    </span>
  );
}
