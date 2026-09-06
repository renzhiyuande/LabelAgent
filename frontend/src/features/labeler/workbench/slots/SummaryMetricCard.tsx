export function SummaryMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
