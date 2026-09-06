export function VerticalOrdinal({ value }: { value: string }) {
  return (
    <span className="flex flex-col items-center justify-center text-[11px] font-semibold leading-4 tracking-[0.18em] text-slate-500 dark:text-slate-300">
      {value.split("").map((char, index) => (
        <span key={`${char}-${index}`}>{char}</span>
      ))}
    </span>
  );
}
