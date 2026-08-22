// Instant-runoff counting for a single election question, matching OpaVote's
// general IRV method: repeatedly eliminate the lowest-voted continuing
// candidate and transfer their ballots to each voter's next continuing
// preference, until one candidate holds a strict majority of ballots still
// in play (a ballot with no remaining continuing preference is "exhausted"
// and drops out of the denominator, same as OpaVote).

// Deterministic PRNG (mulberry32), seeded per-election so a tie-break can be
// reproduced exactly on a re-count instead of re-rolling a new coin flip.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface IrvBallot {
  // A voter's ranked option ids for this question, first choice first.
  optionIds: string[];
}

export interface IrvRound {
  round: number;
  // Vote count for every candidate still standing at this round (eliminated
  // candidates from earlier rounds are omitted).
  counts: Record<string, number>;
  eliminated: string | null;
  // Set only on the tie-break that decided who's eliminated this round.
  tieBrokenAmong: string[] | null;
}

export interface IrvResult {
  rounds: IrvRound[];
  winnerId: string | null;
  exhaustedBallots: number;
  totalBallots: number;
}

export function runInstantRunoff(
  optionIds: string[],
  ballots: IrvBallot[],
  tieBreakSeed: string
): IrvResult {
  const random = seededRandom(tieBreakSeed);
  const standing = new Set(optionIds);
  const rounds: IrvRound[] = [];
  let winnerId: string | null = null;
  let finalActiveBallots = 0;

  // Each ballot's list of continuing preferences, trimmed as candidates are
  // eliminated; a ballot becomes exhausted once none remain.
  const remaining = ballots.map((b) => [...b.optionIds]);

  for (let round = 1; standing.size > 0; round++) {
    const counts: Record<string, number> = {};
    for (const id of standing) counts[id] = 0;
    let activeBallots = 0;

    for (const prefs of remaining) {
      while (prefs.length > 0 && !standing.has(prefs[0])) prefs.shift();
      if (prefs.length > 0) {
        counts[prefs[0]]++;
        activeBallots++;
      }
    }
    finalActiveBallots = activeBallots;

    if (standing.size === 1) {
      winnerId = [...standing][0];
      rounds.push({ round, counts, eliminated: null, tieBrokenAmong: null });
      break;
    }

    const majority = activeBallots > 0 ? activeBallots / 2 : 0;
    const leader = [...standing].reduce((a, b) => (counts[a] >= counts[b] ? a : b));
    if (activeBallots > 0 && counts[leader] > majority) {
      winnerId = leader;
      rounds.push({ round, counts, eliminated: null, tieBrokenAmong: null });
      break;
    }

    // Eliminate the lowest. A tie for lowest is broken by a seeded random
    // draw among the tied candidates (OpaVote's "random" tie-break option).
    const lowestCount = Math.min(...[...standing].map((id) => counts[id]));
    const lowest = [...standing].filter((id) => counts[id] === lowestCount);
    const eliminated =
      lowest.length === 1 ? lowest[0] : lowest[Math.floor(random() * lowest.length)];

    rounds.push({
      round,
      counts,
      eliminated,
      tieBrokenAmong: lowest.length > 1 ? lowest : null,
    });
    standing.delete(eliminated);
  }

  const exhaustedBallots = ballots.length - finalActiveBallots;

  return { rounds, winnerId, exhaustedBallots, totalBallots: ballots.length };
}
