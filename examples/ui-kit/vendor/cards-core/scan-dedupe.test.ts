import { describe, it, expect } from 'vitest';
import { ScanIngestGate } from './scan-dedupe.js';

/** Ticks arrive ~350ms apart in the real capture loop. */
const TICK = 350;

/** Drive one auto-loop sighting: check the gate, and record when it fires. */
const sight = (g: ScanIngestGate, identity: string, now: number): boolean => {
  if (!g.mayIngest(identity, now)) return false;
  g.recordIngest(identity, now);
  return true;
};

describe('ScanIngestGate (identity-CHANGE auto-ingest gate)', () => {
  it('ingests exactly once across a 30s handheld hold WITH flicker gaps (the many-copies bug)', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    let ingests = 0;
    // Handheld repro: the card never leaves the hand, but draw2 misses runs of
    // frames (motion blur). Sightings arrive in bursts separated by 3–6s gaps —
    // every gap exceeded the old absence re-arm and re-added the card.
    let t = 0;
    for (let burst = 0; burst < 6; burst++) {
      for (let i = 0; i < 5; i++) {
        if (sight(g, 'Blue-Eyes White Dragon', t)) ingests++;
        t += TICK;
      }
      t += 3000 + burst * 600; // flicker gap ≥ the old 2.5s absence window
    }
    expect(ingests).toBe(1);
  });

  it('same identity after ANY gap never re-adds (no time-based re-arm)', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    expect(sight(g, 'card', 0)).toBe(true);
    expect(sight(g, 'card', 10_000)).toBe(false);
    expect(sight(g, 'card', 120_000)).toBe(false);
  });

  it('identity A→B→A ingests three times (each is a CHANGE)', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    expect(sight(g, 'A', 0)).toBe(true);
    expect(sight(g, 'A', TICK)).toBe(false); // still A
    expect(sight(g, 'B', 5000)).toBe(true); // changed → ingest
    expect(sight(g, 'B', 5000 + TICK)).toBe(false);
    expect(sight(g, 'A', 10_000)).toBe(true); // back to A = a CHANGE again
  });

  it('safety cooldown absorbs the transition frame (a DIFFERENT identity within ~1.5s waits)', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    expect(sight(g, 'A', 0)).toBe(true);
    // draw2 flips to B on the very next tick (old card half out of frame).
    expect(sight(g, 'B', TICK)).toBe(false); // inside cooldown
    expect(sight(g, 'B', 1400)).toBe(false); // still inside
    expect(sight(g, 'B', 1600)).toBe(true); // cooldown over → real change
  });

  it('a FAILED ingest (mayIngest true but never recorded) stays eligible for retry', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    expect(g.mayIngest('card', 0)).toBe(true);
    // upload failed → recordIngest never called
    expect(g.mayIngest('card', TICK)).toBe(true); // no cooldown, no latch — retry
    g.recordIngest('card', TICK);
    expect(g.mayIngest('card', TICK * 2)).toBe(false); // latched after success
  });

  it('a manual/tap add records too, so the auto loop will not re-add that card', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    g.recordIngest('tapped card', 0); // explicit tap bypassed mayIngest entirely
    expect(g.mayIngest('tapped card', 5000)).toBe(false);
    expect(g.mayIngest('another card', 5000)).toBe(true);
  });

  it('reset() forgets the latch (scanner closed / mode switch / destination change)', () => {
    const g = new ScanIngestGate({ cooldownMs: 1500 });
    expect(sight(g, 'card', 0)).toBe(true);
    expect(sight(g, 'card', 5000)).toBe(false);
    g.reset();
    expect(sight(g, 'card', 5100)).toBe(true); // fresh session — and no stale cooldown
  });
});
