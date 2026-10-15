/**
 * Unit tests for the pure draw2 helpers — the detect-frame downscale factor, the
 * bbox→source mapping, and the best-detection pick. draw2 returns bbox in the
 * coordinates of the frame we SEND it (a downscaled ~640px frame); these keep the
 * crop mapping in sync. (Ported from bucket-hub/src/api/draw2.test.ts when the
 * client was consolidated into ui-kit.)
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { detectScale, scaleBbox, bestDetection, draw2Detect, draw2Health, probeFirstReachable, type Draw2Detection } from './draw2';

describe('detectScale', () => {
  it('downscales a large frame to fit the max edge', () => {
    expect(detectScale(1920, 640)).toBeCloseTo(640 / 1920, 6);
    expect(detectScale(1080, 640)).toBeCloseTo(640 / 1080, 6);
  });
  it('never upscales a frame already within the max edge', () => {
    expect(detectScale(500, 640)).toBe(1);
    expect(detectScale(640, 640)).toBe(1);
  });
});

describe('scaleBbox', () => {
  it('maps a detect-frame bbox back up to the source resolution', () => {
    const source = 1920;
    const factor = detectScale(source, 640); // 1/3
    const detectWidth = Math.round(source * factor); // 640
    const upScale = source / detectWidth; // 3
    const detectBbox = [100, 80, 200, 300];
    expect(scaleBbox(detectBbox, upScale)).toEqual([300, 240, 600, 900]);
  });
  it('is a no-op when the frame was not downscaled (scale 1)', () => {
    expect(scaleBbox([10, 20, 30, 40], 1)).toEqual([10, 20, 30, 40]);
  });
});

describe('bestDetection', () => {
  it('picks the highest-confidence usable (4-value bbox) detection', () => {
    const dets: Draw2Detection[] = [
      { name: 'A', confidence: 0.5, bbox: [0, 0, 1, 1] },
      { name: 'B', confidence: 0.9, bbox: [0, 0, 1, 1] },
      { name: 'C', confidence: 0.99, bbox: [0, 0, 1] }, // unusable bbox
    ];
    expect(bestDetection(dets)?.name).toBe('B');
  });
  it('returns null when nothing is usable', () => {
    expect(bestDetection([{ name: '', confidence: 1, bbox: [0, 0, 1, 1] }])).toBeNull();
  });
  it('keeps draw2s raw top pick when no floor is given (default 0)', () => {
    const dets: Draw2Detection[] = [{ name: 'Marginal', confidence: 0.05, bbox: [0, 0, 1, 1] }];
    expect(bestDetection(dets)?.name).toBe('Marginal');
  });
  it('drops detections under minConfidence and picks the best of the rest', () => {
    const dets: Draw2Detection[] = [
      { name: 'Weak', confidence: 0.4, bbox: [0, 0, 1, 1] },
      { name: 'Strong', confidence: 0.75, bbox: [0, 0, 1, 1] },
      { name: 'Stronger', confidence: 0.9, bbox: [0, 0, 1, 1] },
    ];
    expect(bestDetection(dets, 0.6)?.name).toBe('Stronger');
  });
  it('returns null when every detection is under minConfidence', () => {
    const dets: Draw2Detection[] = [
      { name: 'Weak', confidence: 0.4, bbox: [0, 0, 1, 1] },
      { name: 'Weaker', confidence: 0.1, bbox: [0, 0, 1, 1] },
    ];
    expect(bestDetection(dets, 0.6)).toBeNull();
  });
  it('treats minConfidence as an inclusive floor', () => {
    const dets: Draw2Detection[] = [{ name: 'Exactly', confidence: 0.6, bbox: [0, 0, 1, 1] }];
    expect(bestDetection(dets, 0.6)?.name).toBe('Exactly');
  });
});

// The optional `authToken` (bot-proxy mode) rides as an Authorization: Bearer
// header; omitting it (hub / direct-tailnet) sends no auth header — today's shape.
describe('draw2 optional auth (bot-proxy mode)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const headersOf = (init?: RequestInit): Record<string, string> =>
    (init?.headers as Record<string, string> | undefined) ?? {};

  it('draw2Detect attaches the bearer token when authToken is set', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ detections: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await draw2Detect('http://proxy.test/api/hub/cards/draw2', 'data:image/jpeg;base64,AAA', 4000, 'tok-123');
    const [, init] = fetchSpy.mock.calls[0];
    expect(headersOf(init).Authorization).toBe('Bearer tok-123');
    expect(headersOf(init)['Content-Type']).toBe('application/json');
  });

  it('draw2Detect sends NO auth header when authToken is omitted (direct mode)', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ detections: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await draw2Detect('http://draw2.tailnet', 'data:image/jpeg;base64,AAA');
    const [, init] = fetchSpy.mock.calls[0];
    expect(headersOf(init).Authorization).toBeUndefined();
  });

  it('draw2Health attaches the bearer token when authToken is set', async () => {
    const fetchSpy = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await draw2Health('http://proxy.test/api/hub/cards/draw2', 2500, 'tok-xyz');
    const [, init] = fetchSpy.mock.calls[0];
    expect(headersOf(init).Authorization).toBe('Bearer tok-xyz');
  });
});

// The dual-origin seam: probe the funnel + tailnet draw2 proxy origins in
// parallel and use whichever `/health` answers (YGO 245's complementary on/off-
// tailnet origins). Never rejects; resolves the reachable url or null.
describe('probeFirstReachable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** A fetch stub that answers per-URL: `ok` = which `.../health` returns 200,
   *  `delayMs` = how long each URL takes to answer (to assert first-to-resolve). */
  const stubFetch = (ok: Record<string, boolean>, delayMs: Record<string, number> = {}) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input).replace(/\/health$/, '');
        const wait = delayMs[url] ?? 0;
        if (wait) await new Promise((r) => setTimeout(r, wait));
        return new Response('', { status: ok[url] ? 200 : 503 });
      }),
    );
  };

  it('returns the reachable url when only one origin answers 200', async () => {
    stubFetch({ 'http://funnel.test': false, 'http://tailnet.test': true });
    const url = await probeFirstReachable(['http://funnel.test', 'http://tailnet.test']);
    expect(url).toBe('http://tailnet.test');
  });

  it('prefers the FIRST origin to resolve true (races in parallel)', async () => {
    // Both are reachable, but the tailnet host answers sooner → it wins the race.
    stubFetch(
      { 'http://funnel.test': true, 'http://tailnet.test': true },
      { 'http://funnel.test': 50, 'http://tailnet.test': 5 },
    );
    const url = await probeFirstReachable(['http://funnel.test', 'http://tailnet.test']);
    expect(url).toBe('http://tailnet.test');
  });

  it('resolves null when every origin fails (never rejects)', async () => {
    stubFetch({ 'http://funnel.test': false, 'http://tailnet.test': false });
    await expect(probeFirstReachable(['http://funnel.test', 'http://tailnet.test'])).resolves.toBeNull();
  });

  it('ignores empty / duplicate entries and returns null for an all-empty list', async () => {
    stubFetch({ 'http://tailnet.test': true });
    expect(await probeFirstReachable(['', 'http://tailnet.test', '', 'http://tailnet.test'])).toBe('http://tailnet.test');
    expect(await probeFirstReachable(['', ''])).toBeNull();
  });
});
