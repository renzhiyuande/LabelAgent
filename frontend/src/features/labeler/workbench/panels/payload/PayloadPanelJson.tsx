import type { PayloadPanelBodyProps } from "./types";

function PayloadEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

export function PayloadPanelJson({ payload, hasPayload }: Pick<PayloadPanelBodyProps, "payload" | "hasPayload">) {
  if (!hasPayload) {
    return <PayloadEmptyState message="本题暂无导入数据" />;
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">原始 payload</p>
      <pre className="max-h-[min(480px,60vh)] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
