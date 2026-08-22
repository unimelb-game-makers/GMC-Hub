import type { VoteResult } from "@/lib/voting";

export interface OptionVoters {
  optionId: string;
  voterNames: string[];
}

export function VoteTally({
  options,
  result,
  allowMultipleChoices,
  voters,
}: {
  options: { id: string; label: string }[];
  result: VoteResult;
  allowMultipleChoices: boolean;
  voters?: OptionVoters[];
}) {
  const votersByOption = new Map(voters?.map((v) => [v.optionId, v.voterNames]) ?? []);

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const optionResult = result.options[option.id];
        const count = optionResult?.count ?? 0;
        const pct = optionResult?.pct ?? 0;
        const isWinner = !allowMultipleChoices && result.winningOptionId === option.id;
        const optionVoters = votersByOption.get(option.id) ?? [];

        return (
          <div key={option.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className={isWinner ? "font-semibold text-accent" : "font-medium"}>
                {option.label}
              </span>
              <span className="flex items-center gap-2">
                {allowMultipleChoices && result.totalVoters > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      optionResult?.passed
                        ? "bg-[#26402f] text-[#8fd6ac]"
                        : "bg-[#4a2222] text-[#f0a3a3]"
                    }`}
                  >
                    {optionResult?.passed ? "Passed" : "Failed"}
                  </span>
                )}
                <span className="font-mono text-xs text-ink-soft">
                  {count} · {pct.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
              <div
                className={`h-full rounded-full ${isWinner ? "bg-accent" : "bg-line"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {voters && (
              <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
                {optionVoters.map((name, i) => (
                  <li key={i} className="text-xs text-ink-soft">
                    {name}
                  </li>
                ))}
                {optionVoters.length === 0 && (
                  <li className="text-xs text-ink-soft/70">No one voted for this.</li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
