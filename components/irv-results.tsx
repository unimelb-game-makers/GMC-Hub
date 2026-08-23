import type { IrvResult } from "@/lib/irv";

export function IrvResults({
  options,
  result,
}: {
  options: { id: string; label: string }[];
  result: IrvResult;
}) {
  const labelOf = (id: string) => options.find((o) => o.id === id)?.label ?? "unknown";

  // Still lists every candidate, at 0, rather than hiding the question's
  // options entirely: the committee wants to see who was on the ballot
  // even when nobody voted, not just a bare "no ballots" message.
  if (result.totalBallots === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-soft">No ballots were cast for this question.</p>
        <ul className="flex flex-col gap-1">
          {options.map((o) => (
            <li key={o.id} className="font-mono text-sm">
              {o.label}: 0
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Winner:{" "}
        <span className="font-semibold text-accent">
          {result.winnerId ? labelOf(result.winnerId) : "No winner (unresolved tie)"}
        </span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="py-1 pr-3 font-medium">Round</th>
              <th className="py-1 pr-3 font-medium">Counts</th>
              <th className="py-1 font-medium">Eliminated</th>
            </tr>
          </thead>
          <tbody>
            {result.rounds.map((round) => (
              <tr key={round.round} className="border-b border-line/50 align-top">
                <td className="py-1.5 pr-3 font-mono">{round.round}</td>
                <td className="py-1.5 pr-3">
                  {Object.entries(round.counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([id, count]) => (
                      <div key={id} className="font-mono">
                        {labelOf(id)}: {count}
                      </div>
                    ))}
                </td>
                <td className="py-1.5 text-ink-soft">
                  {round.eliminated ? (
                    <>
                      {labelOf(round.eliminated)}
                      {round.tieBrokenAmong && (
                        <span className="block text-xs">
                          (tie-break among {round.tieBrokenAmong.map(labelOf).join(", ")})
                        </span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.exhaustedBallots > 0 && (
        <p className="text-xs text-ink-soft">
          {result.exhaustedBallots} ballot{result.exhaustedBallots === 1 ? "" : "s"} exhausted
          (ranked only eliminated candidates).
        </p>
      )}
    </div>
  );
}
