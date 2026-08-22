import type { VoteResult } from "@/lib/voting";

export function VoteTally({
  options,
  result,
}: {
  options: { id: string; label: string }[];
  result: VoteResult;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const count = result.counts[option.id] ?? 0;
        const pct = result.totalBallots > 0 ? (count / result.totalBallots) * 100 : 0;
        const isWinner = result.winningOptionId === option.id;
        return (
          <div key={option.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className={isWinner ? "font-semibold text-accent" : "font-medium"}>
                {option.label}
              </span>
              <span className="font-mono text-xs text-ink-soft">
                {count} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
              <div
                className={`h-full rounded-full ${isWinner ? "bg-accent" : "bg-line"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
