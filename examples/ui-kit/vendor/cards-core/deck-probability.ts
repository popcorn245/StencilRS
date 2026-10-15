/**
 * Hand-test consistency math (docs planned/yugioh-playtest/playtester
 * §the-consistency-math): exact hypergeometric for single-category odds and
 * a Monte-Carlo path for compound predicates over user categories — user
 * categories may OVERLAP (one card can be both starter and extender), which
 * breaks the multivariate closed form, so compound rows are sampled.
 * Framework-free; `Math.random` is fine (toy simulator, not crypto).
 */
import type { DeckEntry } from './deck.js';

/** Expand a deck part to one passcode per COPY, in a stable order. */
export function expandPart(entries: DeckEntry[]): string[] {
  return entries.flatMap((e) => Array<string>(Math.max(0, Math.floor(e.count))).fill(e.passcode));
}

/** Unbiased in-place Fisher-Yates (i from n−1 down to 1; j = uniform 0..i). */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i >= 1; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Iterative float C(a,b) — N ≤ 60 here, no overflow concerns at these sizes. */
export function choose(a: number, b: number): number {
  if (b < 0 || b > a) return 0;
  const k = Math.min(b, a - b);
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (a - k + i)) / i;
  return c;
}

/**
 * Exact hypergeometric P(draw exactly k of a K-sized category in n cards
 * from an N-card deck).
 */
export function pExactlyK(N: number, n: number, K: number, k: number): number {
  const denom = choose(N, n);
  return denom === 0 ? 0 : (choose(K, k) * choose(N - K, n - k)) / denom;
}

/**
 * Exact P(open ≥ k of category) = 1 − Σ_{i=0}^{k−1} C(K,i)·C(N−K,n−i)/C(N,n).
 * Pinned values (unit-tested): N=40,n=5,K=9,k=1 → 0.74178…; K=12 → 0.85064….
 */
export function pAtLeastK(N: number, n: number, K: number, k: number): number {
  if (k <= 0) return 1;
  let miss = 0;
  for (let i = 0; i < k; i++) miss += pExactlyK(N, n, K, i);
  return Math.min(1, Math.max(0, 1 - miss));
}

/**
 * Monte-Carlo estimate for compound predicates over possibly-OVERLAPPING
 * categories: `trials` shuffles of the expanded main, take the first `n`,
 * evaluate the predicate on the sampled hand, report the frequency.
 * Standard error at p≈0.5 with 10k trials is ±0.5pp — display integers.
 */
export function monteCarloCompound(
  expandedMain: string[],
  n: number,
  predicate: (hand: string[]) => boolean,
  trials = 10_000,
  rand: () => number = Math.random,
): number {
  if (trials <= 0 || expandedMain.length === 0) return 0;
  const deck = expandedMain.slice();
  const hand = Math.min(Math.max(0, n), deck.length);
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    shuffle(deck, rand);
    if (predicate(deck.slice(0, hand))) hits++;
  }
  return hits / trials;
}

/** Count how many cards of a hand belong to a category (a passcode set). */
export function countInCategory(hand: string[], category: ReadonlySet<string>): number {
  let c = 0;
  for (const p of hand) if (category.has(p)) c++;
  return c;
}
