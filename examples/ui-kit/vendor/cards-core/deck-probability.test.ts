import { describe, expect, it } from 'vitest';
import {
  choose,
  countInCategory,
  expandPart,
  monteCarloCompound,
  pAtLeastK,
  pExactlyK,
  shuffle,
} from './deck-probability.js';

describe('expandPart', () => {
  it('expands entries to one passcode per copy in stable order', () => {
    expect(expandPart([{ passcode: 'a', count: 3 }, { passcode: 'b', count: 1 }])).toEqual(['a', 'a', 'a', 'b']);
    expect(expandPart([])).toEqual([]);
  });
});

describe('choose', () => {
  it('matches known binomials', () => {
    expect(choose(5, 2)).toBe(10);
    expect(choose(40, 5)).toBe(658008);
    expect(choose(60, 0)).toBe(1);
    expect(choose(3, 5)).toBe(0);
    expect(choose(10, -1)).toBe(0);
  });
});

describe('pAtLeastK — the spec-pinned hypergeometric values', () => {
  it('N=40, n=5, K=9, k=1 → 0.74178…', () => {
    expect(pAtLeastK(40, 5, 9, 1)).toBeCloseTo(0.74178, 4);
  });

  it('N=40, n=5, K=12, k=1 → 0.85064…', () => {
    expect(pAtLeastK(40, 5, 12, 1)).toBeCloseTo(0.85064, 4);
  });

  it('degenerate cases: k=0 → 1; K=0 → 0 for k≥1; complement identity', () => {
    expect(pAtLeastK(40, 5, 9, 0)).toBe(1);
    expect(pAtLeastK(40, 5, 0, 1)).toBe(0);
    // P(brick) = P(0 starters) = 1 − P(≥1)
    expect(pExactlyK(40, 5, 9, 0)).toBeCloseTo(1 - pAtLeastK(40, 5, 9, 1), 10);
  });

  it('n grows → odds grow (the ＋ Draw path)', () => {
    expect(pAtLeastK(40, 6, 9, 1)).toBeGreaterThan(pAtLeastK(40, 5, 9, 1));
  });
});

describe('shuffle — Fisher-Yates', () => {
  it('is a permutation (multiset preserved)', () => {
    const arr = ['a', 'a', 'b', 'c', 'd', 'e'];
    const out = shuffle(arr.slice());
    expect(out.slice().sort()).toEqual(arr.slice().sort());
  });

  it('distribution sanity over a small permutation space (3! = 6, seeded LCG)', () => {
    // Deterministic LCG so the test can't flake.
    let seed = 42;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const counts = new Map<string, number>();
    const TRIALS = 6000;
    for (let i = 0; i < TRIALS; i++) {
      const key = shuffle(['a', 'b', 'c'], rand).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6); // every permutation reachable
    for (const c of counts.values()) {
      // Expected 1000 each; allow a generous band (±20%) for 6k trials.
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });
});

describe('monteCarloCompound', () => {
  // Deterministic LCG again — pinned tolerance without flake.
  function lcg(seedInit: number) {
    let seed = seedInit;
    return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  }

  it('single-category MC agrees with the exact hypergeometric (±2pp at 10k trials)', () => {
    // 9 starters in a 40-card deck.
    const starters = new Set(Array.from({ length: 9 }, (_, i) => `s${i}`));
    const deck = [...starters, ...Array.from({ length: 31 }, (_, i) => `x${i}`)];
    const p = monteCarloCompound(deck, 5, (hand) => countInCategory(hand, starters) >= 1, 10_000, lcg(7));
    expect(p).toBeCloseTo(pAtLeastK(40, 5, 9, 1), 1);
    expect(Math.abs(p - 0.74178)).toBeLessThan(0.02);
  });

  it('handles OVERLAPPING categories (the reason MC exists — no disjoint closed form)', () => {
    // 5 cards that are BOTH starter and extender + 4 pure starters in 40.
    const starters = new Set(['b0', 'b1', 'b2', 'b3', 'b4', 'p0', 'p1', 'p2', 'p3']);
    const extenders = new Set(['b0', 'b1', 'b2', 'b3', 'b4']);
    const deck = [...starters, ...Array.from({ length: 31 }, (_, i) => `x${i}`)];
    const p = monteCarloCompound(
      deck, 5,
      (hand) => countInCategory(hand, starters) >= 1 && countInCategory(hand, extenders) >= 1,
      10_000, lcg(11),
    );
    // P(≥1 starter AND ≥1 extender) can't exceed P(≥1 extender) and can't be 0.
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(pAtLeastK(40, 5, 5, 1) + 0.02);
  });

  it('empty deck / zero trials → 0 (no NaN)', () => {
    expect(monteCarloCompound([], 5, () => true)).toBe(0);
    expect(monteCarloCompound(['a'], 5, () => true, 0)).toBe(0);
  });

  it('always-true predicate → 1', () => {
    expect(monteCarloCompound(['a', 'b', 'c'], 2, () => true, 100, lcg(3))).toBe(1);
  });
});
