// Deterministic PRNG (mulberry32), same construction as lib/irv.ts's
// tie-break random, kept as a separate copy since the two aren't
// conceptually related (one seeds a ballot's display order, the other a
// count's tie-break) even though the algorithm is identical.
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

// Fisher-Yates, seeded: given the same seed, always returns the same
// order. Used to vary an election ballot's candidate display order per
// voter without relying on Math.random(), which would render differently
// on the server and the client and trip a hydration mismatch.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
