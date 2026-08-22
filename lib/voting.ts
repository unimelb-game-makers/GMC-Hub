import type { Role, VoteStatus } from "@/lib/types";

export function voteStatus(
  vote: { opensAt: string | null; closesAt: string; closedEarlyAt: string | null },
  now: Date = new Date()
): VoteStatus {
  const opensAt = vote.opensAt ? new Date(vote.opensAt) : null;
  const effectiveClose = new Date(vote.closedEarlyAt ?? vote.closesAt);
  if (opensAt && now < opensAt) return "upcoming";
  if (now >= effectiveClose) return "closed";
  return "open";
}

export function canVote(allowedRoles: Role[], userRoles: Role[]): boolean {
  return allowedRoles.length === 0 || allowedRoles.some((r) => userRoles.includes(r));
}

export interface OptionResult {
  count: number;
  pct: number;
  // Only meaningful for a multi-select vote, where every option is judged
  // independently (more than 50% of participating voters chose it).
  passed: boolean;
}

export interface VoteResult {
  totalVoters: number;
  options: Record<string, OptionResult>;
  // Single-select only: the one option with the most ballots, or null on a
  // tie. Multi-select votes have no single winner, since a voter can back
  // more than one option at once.
  winningOptionId: string | null;
  isTie: boolean;
  // Single-select only: whether the winning option passed with strictly
  // more than 50% of voters. For multi-select, check each option's own
  // `passed` in `options` instead.
  passed: boolean;
}

// Percentages are of participating voters, not raw ballot rows: a
// multi-select voter can appear in more than one option's count, so
// "ballots cast" isn't the right denominator once that's allowed.
export function resolveVote(
  optionIds: string[],
  ballots: { optionId: string; voterId: string }[],
  allowMultipleChoices: boolean
): VoteResult {
  const counts: Record<string, number> = Object.fromEntries(optionIds.map((id) => [id, 0]));
  for (const b of ballots) {
    counts[b.optionId] = (counts[b.optionId] ?? 0) + 1;
  }
  const totalVoters = new Set(ballots.map((b) => b.voterId)).size;

  const options: Record<string, OptionResult> = {};
  for (const id of optionIds) {
    const count = counts[id];
    const pct = totalVoters > 0 ? (count / totalVoters) * 100 : 0;
    options[id] = { count, pct, passed: totalVoters > 0 && count / totalVoters > 0.5 };
  }

  if (allowMultipleChoices || totalVoters === 0) {
    return { totalVoters, options, winningOptionId: null, isTie: false, passed: false };
  }

  // Single-select: tied votes fail; otherwise the top option passes only
  // with strictly more than 50% of participating voters.
  let topCount = -1;
  let topOptionIds: string[] = [];
  for (const id of optionIds) {
    const c = counts[id];
    if (c > topCount) {
      topCount = c;
      topOptionIds = [id];
    } else if (c === topCount) {
      topOptionIds.push(id);
    }
  }
  const isTie = topOptionIds.length > 1;
  const winningOptionId = isTie ? null : topOptionIds[0];
  const passed = !isTie && topCount / totalVoters > 0.5;

  return { totalVoters, options, winningOptionId, isTie, passed };
}
