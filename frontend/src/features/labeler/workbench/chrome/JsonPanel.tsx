export function JsonPanel({ data }: { data: unknown }) {
  return (
    <pre className="min-h-[220px] overflow-auto bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
