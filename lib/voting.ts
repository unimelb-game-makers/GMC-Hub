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

export interface VoteResult {
  totalBallots: number;
  counts: Record<string, number>;
  winningOptionId: string | null;
  isTie: boolean;
  passed: boolean;
}

// Tied votes fail. Otherwise the option with the most ballots passes only
// if it has strictly more than 50% of all ballots cast.
export function resolveVote(
  optionIds: string[],
  ballots: { optionId: string }[]
): VoteResult {
  const counts: Record<string, number> = Object.fromEntries(optionIds.map((id) => [id, 0]));
  for (const b of ballots) {
    counts[b.optionId] = (counts[b.optionId] ?? 0) + 1;
  }
  const totalBallots = ballots.length;
  if (totalBallots === 0) {
    return { totalBallots, counts, winningOptionId: null, isTie: false, passed: false };
  }

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
  const passed = !isTie && topCount / totalBallots > 0.5;

  return { totalBallots, counts, winningOptionId, isTie, passed };
}
