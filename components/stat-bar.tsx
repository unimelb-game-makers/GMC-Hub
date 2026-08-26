// Same bar visual language as VoteTally's result bars: a thin bg-bg track
// with an accent fill sized by percentage, kept consistent across the app
// wherever a count needs a proportional bar rather than just a number.
export function StatBar({
  label,
  count,
  pct,
  accent = false,
}: {
  label: string;
  count: number;
  pct: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={`min-w-0 truncate ${accent ? "font-medium text-accent" : "font-medium"}`}>
          {label}
        </span>
        <span className="flex-none font-mono text-xs text-ink-soft">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full ${accent ? "bg-accent" : "bg-line"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
