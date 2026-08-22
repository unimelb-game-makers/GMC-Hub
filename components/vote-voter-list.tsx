export interface VoterBallot {
  voterName: string;
  optionLabel: string;
}

export function VoteVoterList({ ballots }: { ballots: VoterBallot[] }) {
  return (
    <div className="mt-4">
      <h2 className="text-sm font-medium text-ink-soft">Who voted for what</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {ballots.map((b, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm"
          >
            <span className="font-medium">{b.voterName}</span>
            <span className="text-ink-soft">{b.optionLabel}</span>
          </li>
        ))}
        {ballots.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-soft/70">
            No votes cast.
          </li>
        )}
      </ul>
    </div>
  );
}
