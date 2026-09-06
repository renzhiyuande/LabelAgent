function AnnotateEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

export function AnnotatePanelJson({
  values,
  fieldCount,
}: {
  values: Record<string, unknown>;
  fieldCount: number;
}) {
  if (fieldCount === 0) {
    return (
      <AnnotateEmptyState message="当前模板未配置可编辑的标注字段。请在模板设计器中将需要填写的字段设置为「标注 / input」角色。" />
    );
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">当前作答</p>
      <pre className="max-h-[min(480px,60vh)] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}
