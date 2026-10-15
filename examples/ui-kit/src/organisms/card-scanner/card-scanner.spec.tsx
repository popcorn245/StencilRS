import { vi } from 'vitest';
import { newSpecPage } from '../../test-utils/spec-page';

// ── Mock the draw2 client so tests never touch the network / a real device.
const h = vi.hoisted(() => ({
  warm: vi.fn(async () => false),
  health: vi.fn(async () => false),
  detect: vi.fn(async () => []),
  order: [] as string[],
}));

vi.mock('../../helpers/draw2', async () => {
  const actual = await vi.importActual<typeof import('../../helpers/draw2')>('../../helpers/draw2');
  return {
    ...actual,
    warmDraw2Permission: (url: string) => {
      h.order.push('warm');
      return h.warm(url);
    },
    draw2Health: (url: string, t?: number) => {
      h.order.push('health');
      return h.health(url, t);
    },
    // The scanner probes candidate origins through probeFirstReachable — mock it
    // to delegate to the per-url `h.health` (the real one would bypass the mocked
    // draw2Health via a module-internal reference) so tests keep driving
    // reachability, dual-origin selection included, through the single h.health.
    probeFirstReachable: async (urls: string[], t?: number) => {
      h.order.push('probe');
      for (const url of urls.filter(Boolean)) {
        if (await h.health(url, t)) return url;
      }
      return null;
    },
    draw2Detect: (...args: unknown[]) => h.detect(...(args as [])),
  };
});

// The decoder must never pull qr-scanner in jsdom — stub it to a null decoder.
vi.mock('../../helpers/frame-decode', () => ({
  createFrameDecoder: async () => ({ engine: 'native', decode: async () => null }),
}));

import { PopCardScanner } from './card-scanner';

const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop() {} }] } as unknown as MediaStream;
}

describe('pop-card-scanner', () => {
  beforeEach(() => {
    h.warm.mockReset().mockResolvedValue(false);
    h.health.mockReset().mockResolvedValue(false);
    h.detect.mockReset().mockResolvedValue([]);
    h.order.length = 0;
  });

  // ── BUG 1: the Local-Network-Access warm ──────────────────────────────────
  it('runs the LNA permission warm on open and keeps streaming false while draw2 is unreachable', async () => {
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://draw2.test" mode="scan"></pop-card-scanner>`,
    });
    await flush();
    // The warm long-leash probe is invoked so Chrome's tailnet prompt can be
    // answered before the monitor's short-abort recheck probes ever run (those
    // are driven by the tick loop, which only starts after the camera opens).
    expect(h.warm).toHaveBeenCalledWith('https://draw2.test');
    // Unreachable draw2 → passive detect/streaming stays OFF (recoverably).
    expect((page.rootInstance as PopCardScanner).streaming).toBe(false);
    (page.rootInstance as PopCardScanner).disconnectedCallback();
  });

  it('does not touch draw2 at all when no draw2Url is configured', async () => {
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner mode="scan"></pop-card-scanner>`,
    });
    await flush();
    expect(h.warm).not.toHaveBeenCalled();
    expect(h.health).not.toHaveBeenCalled();
    (page.rootInstance as PopCardScanner).disconnectedCallback();
  });

  it('promotes streaming and emits streamingChange once draw2 answers', async () => {
    // draw2 unreachable during didLoad so the first monitor concludes false and
    // does NOT flip/emit — streaming stays off (recoverably).
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://draw2.test" mode="scan"></pop-card-scanner>`,
    });
    await flush();
    expect((page.rootInstance as PopCardScanner).streaming).toBe(false);
    const events: boolean[] = [];
    page.root.addEventListener('streamingChange', (e) => events.push((e as CustomEvent).detail));
    // draw2 answers now → a fresh probe promotes and emits streamingChange(true).
    h.health.mockResolvedValue(true);
    (page.rootInstance as any).initDraw2();
    await flush();
    await flush();
    expect((page.rootInstance as PopCardScanner).streaming).toBe(true);
    expect(events).toContain(true);
    (page.rootInstance as PopCardScanner).disconnectedCallback();
  });

  // ── dual-origin fallback (YGO 245 on/off-tailnet) ──────────────────────────
  // The detect path downscales through a <canvas>; jsdom has no 2d context, so
  // stub the prototype to a no-op ctx + a fixed data URL for these two cases.
  const stubCanvas = () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: () => {} } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAAA');
  };

  it('selects the reachable origin when only the FALLBACK answers and routes detect to it', async () => {
    // Only the fallback (tailnet) origin is healthy; the primary (funnel) is not —
    // the on-tailnet case. draw2Health during didLoad is false, so promote via a
    // fresh probe once the per-url stub is in place.
    stubCanvas();
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://funnel.test" draw2-url-fallback="https://tailnet.test" mode="scan"></pop-card-scanner>`,
    });
    await flush();
    const inst = page.rootInstance as PopCardScanner & { activeDraw2Url?: string };
    // Reachable only via the fallback origin.
    h.health.mockImplementation(async (url: string) => url === 'https://tailnet.test');
    (inst as any).initDraw2();
    await flush();
    await flush();
    expect(inst.streaming).toBe(true);
    // The health probe selected the fallback origin …
    expect(inst.activeDraw2Url).toBe('https://tailnet.test');
    // … and a detect targets that selected origin, not the (unreachable) primary.
    h.detect.mockResolvedValue([{ name: 'Dark Magician', confidence: 0.9, bbox: [0, 0, 10, 10] }]);
    await inst.detectFrame(document.createElement('canvas'), 0);
    expect(h.detect).toHaveBeenCalled();
    expect(h.detect.mock.calls[0][0]).toBe('https://tailnet.test');
    inst.disconnectedCallback();
    vi.restoreAllMocks();
  });

  it('single-origin (no fallback) keeps using draw2Url for detect', async () => {
    stubCanvas();
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://draw2.test" mode="scan"></pop-card-scanner>`,
    });
    await flush();
    const inst = page.rootInstance as PopCardScanner & { activeDraw2Url?: string };
    h.health.mockResolvedValue(true);
    (inst as any).initDraw2();
    await flush();
    await flush();
    expect(inst.activeDraw2Url).toBe('https://draw2.test');
    h.detect.mockResolvedValue([{ name: 'Kuriboh', confidence: 0.8, bbox: [0, 0, 5, 5] }]);
    await inst.detectFrame(document.createElement('canvas'), 0);
    expect(h.detect.mock.calls[0][0]).toBe('https://draw2.test');
    inst.disconnectedCallback();
    vi.restoreAllMocks();
  });

  // ── BUG 2: the single stable <video> across a mode switch ──────────────────
  it('keeps the SAME <video> element with its stream attached across a Scan→Capture switch', async () => {
    const stream = fakeStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner mode="scan"></pop-card-scanner>`,
    });
    const inst = page.rootInstance as PopCardScanner & { onModeChange(m: 'scan' | 'capture'): void };
    const videoBefore = page.root.querySelector('video')!;
    expect(videoBefore).toBeTruthy();
    // The stream is imperatively (re)attached via the ref callback.
    expect((videoBefore as HTMLVideoElement).srcObject).toBe(stream);

    // Flip mode — the hub's black-camera bug was the <video> being recreated here.
    (inst as any).mode = 'capture';
    inst.onModeChange('capture');
    await page.waitForChanges();

    const videoAfter = page.root.querySelector('video')!;
    // SAME element instance (never recreated) …
    expect(videoAfter).toBe(videoBefore);
    // … and the stream is STILL attached (never blanked).
    expect((videoAfter as HTMLVideoElement).srcObject).toBe(stream);
    inst.disconnectedCallback();
  });

  it('reattaches the stream on every render (ref idempotency) without blanking it', async () => {
    const stream = fakeStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner mode="capture"></pop-card-scanner>`,
    });
    const inst = page.rootInstance as PopCardScanner;
    const count1 = await inst.getAttachCount();
    expect(count1).toBeGreaterThanOrEqual(1);
    // A re-render with the stream already attached must NOT blank or thrash it.
    await page.waitForChanges();
    expect((page.root.querySelector('video') as HTMLVideoElement).srcObject).toBe(stream);
    inst.disconnectedCallback();
  });

  // ── event surface ─────────────────────────────────────────────────────────
  it('emits capture with the crop + detection + a settle callback that latches the ingest gate', async () => {
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner mode="capture"></pop-card-scanner>`,
    });
    const inst = page.rootInstance as PopCardScanner & {
      emitCapture(base: unknown): void;
      streamBusy: boolean;
      gate: { mayIngest(id: string, now: number): boolean };
    };
    let detail: any = null;
    page.root.addEventListener('capture', (e) => (detail = (e as CustomEvent).detail));
    inst.streamBusy = true;
    (inst as any).emitCapture({
      kind: 'stream',
      detection: { name: 'Dark Magician', confidence: 0.9, bbox: [0, 0, 10, 10] },
      source: {} as HTMLCanvasElement,
      scale: 2,
      crop: 'data:image/jpeg;base64,AAAA',
    });
    expect(detail).toBeTruthy();
    expect(detail.kind).toBe('stream');
    expect(detail.crop).toContain('base64');
    expect(detail.detection.name).toBe('Dark Magician');
    expect(typeof detail.settle).toBe('function');
    // Consumer settles a SUCCESSFUL ingest → gate latches the identity + busy clears.
    detail.settle(true);
    expect(inst.streamBusy).toBe(false);
    expect(inst.gate.mayIngest('Dark Magician', Date.now())).toBe(false);
    inst.disconnectedCallback();
  });

  it('pauses the detect/capture loop while busy — the 429 scan_queue_full backoff', async () => {
    // The consumer drives `busy` true for a short window after a 429 so the scanner
    // does NOT re-POST the SAME card every steady frame while the worker catches up.
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://draw2.test" mode="capture"></pop-card-scanner>`,
    });
    const inst = page.rootInstance as any;
    // A live video + streaming so the tick WOULD otherwise run a detect/capture.
    inst.streaming = true;
    inst.streamingEnabled = true;
    inst.videoEl = { videoWidth: 100 };
    const streamingSpy = vi.spyOn(inst, 'tickStreaming').mockResolvedValue(undefined);
    // busy (backoff active) → the loop is gated: no detect/capture attempt at all.
    inst.busy = true;
    inst.tick();
    expect(streamingSpy).not.toHaveBeenCalled();
    // backoff clears → the loop resumes and attempts a detect again.
    inst.busy = false;
    inst.tick();
    expect(streamingSpy).toHaveBeenCalledTimes(1);
    inst.disconnectedCallback();
    vi.restoreAllMocks();
  });

  it('demoting streaming retracts the live detection and emits streamingChange(false)', async () => {
    const page = await newSpecPage({
      components: [PopCardScanner],
      html: `<pop-card-scanner draw2-url="https://draw2.test" mode="scan"></pop-card-scanner>`,
    });
    const inst = page.rootInstance as PopCardScanner & { setStreaming(v: boolean): void };
    const streamingEvents: boolean[] = [];
    let retracted = false;
    page.root.addEventListener('streamingChange', (e) => streamingEvents.push((e as CustomEvent).detail));
    page.root.addEventListener('cardDetect', (e) => {
      if ((e as CustomEvent).detail?.detection === null) retracted = true;
    });
    (inst as any).setStreaming(true);
    (inst as any).setStreaming(false);
    expect(streamingEvents).toEqual([true, false]);
    expect(retracted).toBe(true);
    inst.disconnectedCallback();
  });
});
