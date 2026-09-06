interface PayloadPanelReviewBannerProps {
  comment: string;
}

export function PayloadPanelReviewBanner({ comment }: PayloadPanelReviewBannerProps) {
  return (
    <div className="border-l-2 border-amber-400/80 py-1 pl-3 dark:border-amber-500/60">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">上一轮打回意见</p>
      <p className="mt-1.5 text-sm leading-6 text-amber-950 dark:text-amber-50">{comment}</p>
    </div>
  );
}
