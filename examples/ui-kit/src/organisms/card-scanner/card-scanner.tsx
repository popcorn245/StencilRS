import { Component, Element, Event, EventEmitter, h, Method, Prop, State, Watch } from '@stencil/core';
import { Draw2HealthMonitor, ScanIngestGate } from '@popcorn245/cards-core';
import {
  bestDetection,
  detectScale,
  draw2Detect,
  probeFirstReachable,
  scaleBbox,
  warmDraw2Permission,
  type Draw2Detection,
} from '../../helpers/draw2';
import { createFrameDecoder, type FrameDecoder } from '../../helpers/frame-decode';

/**
 * ────────────────────────────────────────────────────────────────────────────
 * pop-card-scanner — the SHARED camera/detect core for the Yu-Gi-Oh scanners.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ONE component behind both the bucket-hub unified scanner (Scan vs Card Capture,
 * barcode/QR, draw2 streaming ingest, tap-to-search) and the yugioh-app PWA
 * scanner (family streaming vs friend tap-to-capture). It exists because the two
 * used to duplicate the whole camera stack, and only one of them got the Chrome
 * Local-Network-Access fix (the duplication is exactly why).
 *
 * WHAT THIS COMPONENT OWNS (the drifted-twice primitives, now consolidated):
 *   • Camera lifecycle — getUserMedia, ONE stable <video>, teardown on
 *     disconnect, and the closed-during-permission-prompt guard.
 *   • The Local-Network-Access permission WARM (`warmDraw2Permission`) — a
 *     long-leash probe that lets Chrome's per-origin tailnet prompt actually be
 *     answered before the health monitor's short-abort probes can kill it.
 *   • The draw2 reachability lifecycle (`Draw2HealthMonitor` from cards-core) →
 *     `streaming`, promoting/demoting live and emitting `streamingChange`.
 *   • Mode state (scan | capture) WITHOUT restarting the camera or blanking the
 *     video (the <video> is one stable element; `mode` is a controlled prop).
 *   • Frame-grab / downscale / crop helpers, the detect pacing loop, the
 *     steady-frame pre-gate, the ScanIngestGate identity-change dedupe, and the
 *     barcode/QR decode.
 *
 * WHAT IT DOES NOT OWN (stays in each consumer, wired to events/methods):
 *   ingest/upload endpoints, the added-log, tap-to-search routing, receipt/
 *   classify flows, and the capture-destination picker (injected via a slot).
 *
 * TWO CONFIRMED HUB BUGS, FIXED HERE BY CONSTRUCTION:
 *   1. "Hold up a card, nothing detected" (Scan mode) — the hub gated passive
 *      card detect on `streaming`, which never promoted while Chrome's LNA
 *      permission sat at "prompt" (short-abort probes killed the prompt). This
 *      component runs `warmDraw2Permission()` on open, then rebuilds a FRESH
 *      monitor once draw2 actually answers, so `streaming` promotes and detect
 *      runs. (See `initDraw2`.)
 *   2. "Switch Scan→Capture, camera goes black" — the hub rendered the
 *      capture-destination <select> as a NEW sibling above the <video> only in
 *      Capture mode, so Stencil's non-keyed diff recreated the <video> and the
 *      imperatively-attached stream was lost. Here the <video> is a single
 *      unconditional element inside a stable wrapper, its `srcObject` is
 *      (re)attached in the ref callback whenever a stream exists, and the
 *      capture-destination lives in the `extras` slot OUTSIDE the viewport — so
 *      no re-render or mode switch can reindex or blank it. (See `render` +
 *      `attachStream`.)
 *
 * ── API CONTRACT ────────────────────────────────────────────────────────────
 * Props (consumer-controlled):
 *   draw2Url          Mac draw2 URL; '' → no streaming (barcode/QR + Phase-1 only)
 *   mode              'scan' | 'capture'  (controlled; switching never restarts camera)
 *   autoCapture       Capture mode: auto-ingest steady NEW cards (default true)
 *   busy              Consumer is mid round-trip → pause detect/capture emits
 *   streamingEnabled  Allow streaming/passive-detect at all (hub form target=false)
 *   scanMinConfidence Anti-hallucination floor for Scan-mode passive detect
 *   detectMaxEdge / cropMaxEdge / idealWidth / idealHeight / facingMode
 *
 * Events (app-specific reactions live in the consumer):
 *   streamingChange   boolean — draw2 reachability flipped
 *   modeChange        'scan' | 'capture'
 *   cardDetect        { detection|null, source, scale } — a draw2 detect this tick
 *   barcodeDecode     { value } — a decoded barcode/QR value
 *   capture           { kind:'stream'|'phase1', detection, source, scale, crop, settle }
 *                       an ingest-eligible frame; consumer uploads then calls
 *                       settle(ok) (records the gate on ok, clears the in-flight latch)
 *   cameraError       { message }
 *   scannerClose      void — a built-in close affordance (yugioh use)
 *
 * Methods (imperative helpers so consumers keep their own flows without dup):
 *   grabFrame(), decodeFrame(canvas?), detectFrame(canvas, min?),
 *   cropFromBbox(source, bbox), frameJpeg(source, maxEdge, quality),
 *   captureNow(), recordIngest(identity), resetGate()
 *
 * Slots: `extras` (above the viewport — capture-destination), `overlay` (inside
 * the viewport — tap-catch buttons, labels, pills, badges), `caption`, default
 * (footer — controls, added-log).
 */

export type CardScannerMode = 'scan' | 'capture';

export interface CardDetectDetail {
  detection: Draw2Detection | null;
  source: HTMLCanvasElement | null;
  scale: number;
}

export interface CardCaptureDetail {
  /** 'stream' = a draw2 identity crop (bbox), 'phase1' = a full-frame grab. */
  kind: 'stream' | 'phase1';
  detection: Draw2Detection | null;
  source: HTMLCanvasElement;
  scale: number;
  /** The bbox JPEG crop for streaming; null for phase1 (consumer builds it). */
  crop: string | null;
  /** Call when the consumer's ingest settles: ok latches the identity gate
   *  (streaming) / capture cooldown (phase1) and releases the in-flight latch. */
  settle: (ok: boolean) => void;
}

@Component({
  tag: 'pop-card-scanner',
  encapsulation: { type: 'scoped' },
  styleUrl: 'card-scanner.css',
})
export class PopCardScanner {
  @Element() el!: HTMLElement;

  /** Mac draw2 service URL. '' → streaming disabled (barcode/QR + Phase-1 only).
   *  May be the tailnet draw2 host directly (hub) OR the bucket-bot draw2 PROXY
   *  base (`.../api/hub/cards/draw2`) when `authToken` is set (off-tailnet). */
  @Prop() draw2Url = '';
  /** Optional SECONDARY draw2 proxy origin. When set, the scanner probes both
   *  `draw2Url` and `draw2UrlFallback` in parallel and uses whichever's `/health`
   *  is reachable — for YGO 245's complementary on/off-tailnet origins (the public
   *  Tailscale Funnel works only OFF the tailnet, `bot.popcorn245.com` only ON it),
   *  re-selecting live if connectivity flips. Hub omits it → unchanged
   *  single-origin (`draw2Url`) behavior. */
  @Prop() draw2UrlFallback?: string;
  /** Bearer token for the bot-PROXY draw2 mode (off-tailnet): when set, every
   *  draw2 health/detect call rides `Authorization: Bearer …` and the
   *  Local-Network-Access warm is skipped (the proxy is a normal PUBLIC origin,
   *  not a tailnet IP). Omitted (hub / direct-tailnet) → today's behavior. */
  @Prop() authToken?: string;
  /** Controlled mode — switching never restarts the camera or blanks the video. */
  @Prop({ mutable: true, reflect: true }) mode: CardScannerMode = 'scan';
  /** Capture mode: auto-ingest a steady, NEW (identity-changed) card. */
  @Prop() autoCapture = true;
  /** Consumer is mid round-trip (classify / recognize) — pause detect + capture. */
  @Prop() busy = false;
  /** Allow streaming + passive detect at all (hub's barcode-only form → false). */
  @Prop() streamingEnabled = true;
  /** Anti-hallucination floor (0–1) for the PASSIVE Scan-mode card detector. */
  @Prop() scanMinConfidence = 0.6;
  /** Longest edge (px) of the frame POSTed to draw2 /detect (~1–2s vs ~6s). */
  @Prop() detectMaxEdge = 640;
  /** Longest edge (px) cap on the uploaded crop — keeps the ingest body 413-safe. */
  @Prop() cropMaxEdge = 1000;
  @Prop() idealWidth = 2560;
  @Prop() idealHeight = 1440;
  @Prop() facingMode = 'environment';

  @Event({ composed: true, bubbles: true }) streamingChange!: EventEmitter<boolean>;
  @Event({ composed: true, bubbles: true }) modeChange!: EventEmitter<CardScannerMode>;
  @Event({ composed: true, bubbles: true }) cardDetect!: EventEmitter<CardDetectDetail>;
  @Event({ composed: true, bubbles: true }) barcodeDecode!: EventEmitter<{ value: string }>;
  @Event({ composed: true, bubbles: true }) capture!: EventEmitter<CardCaptureDetail>;
  @Event({ composed: true, bubbles: true }) cameraError!: EventEmitter<{ message: string }>;
  @Event({ composed: true, bubbles: true }) scannerClose!: EventEmitter<void>;

  /** draw2 reachable — passive detect + streaming ingest are live. */
  @State() streaming = false;
  @State() cameraErrorText = '';
  /** The stream's real aspect ratio → the viewport shows the FULL frame (no crop). */
  @State() videoAspect = 0;

  private videoEl?: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private monitor: Draw2HealthMonitor | null = null;
  /** The origin the last successful health probe selected (dual-origin mode) —
   *  detect calls target it so they hit whichever origin is currently reachable. */
  private activeDraw2Url?: string;
  private gate = new ScanIngestGate({ cooldownMs: 1500 });
  private decoder: FrameDecoder | null = null;
  private tickTimer: number | null = null;
  /** One draw2/ingest round-trip at a time — don't spam the queue. */
  private streamBusy = false;
  private lastDraw2At = 0;
  private lastCaptureAt = 0;
  private lastFrameData: Uint8ClampedArray | null = null;
  private stableFrames = 0;
  private closed = false;
  /** Reattach bookkeeping — the spec asserts the ref reattaches across renders. */
  private attachCount = 0;

  private readonly DRAW2_MIN_INTERVAL_MS = 500;
  private readonly SCAN_DETECT_INTERVAL_MS = 900;
  private readonly TICK_MS = 350;

  // ── lifecycle ──────────────────────────────────────────────────────────────

  async componentDidLoad() {
    await this.openCamera();
    // The sheet may have closed while the permission prompt was up (openCamera
    // awaits getUserMedia) — bail before wiring the monitor / decoder / timer.
    if (this.closed) return;
    void this.initDecoder();
    this.initDraw2();
    // The tick loop only runs once a stream is live (openCamera starts it).
  }

  disconnectedCallback() {
    this.teardown();
  }

  @Watch('mode')
  onModeChange(next: CardScannerMode) {
    // Flip modes WITHOUT restarting the camera: just reset the detect/ingest
    // bookkeeping so a stale candidate or a mid-flip gate can't carry over.
    this.gate.reset();
    this.stableFrames = 0;
    this.streamBusy = false;
    this.lastFrameData = null;
    this.modeChange.emit(next);
  }

  // ── camera ───────────────────────────────────────────────────────────────

  private async openCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.cameraErrorText = "I couldn't start the camera. Check camera permissions and try again.";
      return;
    }
    try {
      // Ask for a HIGH-RES stream (ideal-only — browsers clamp gracefully; exact/min
      // throw OverconstrainedError on lesser cameras). Without this the browser
      // defaults to ~640×480 and card crops land ~220×310px — Gemini reads the set
      // code but self-reports low confidence, flagging good cards needsReview.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode, width: { ideal: this.idealWidth }, height: { ideal: this.idealHeight } },
        audio: false,
      });
      // The sheet may have closed while the permission prompt was up;
      // disconnectedCallback already ran (stream was null then) so tear the
      // freshly-granted stream down here or it leaks for the page lifetime.
      if (this.closed) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
        return;
      }
      this.attachStream(this.videoEl);
      this.stableFrames = 0;
      this.lastFrameData = null;
      this.startTick();
    } catch {
      this.cameraErrorText = "I couldn't start the camera. Check camera permissions and try again.";
      this.teardown();
    }
  }

  /** (Re)attach the live stream to the single stable <video>. Idempotent — runs
   *  from the ref callback on EVERY render so a re-render or mode switch never
   *  blanks the viewfinder (bug 2 fix), and once after getUserMedia resolves. */
  private attachStream(el?: HTMLVideoElement) {
    if (!el || !this.stream) return;
    if (el.srcObject === this.stream) return;
    try {
      el.srcObject = this.stream;
      this.attachCount++;
      void el.play?.().catch(() => undefined);
    } catch {
      /* jsdom / unsupported — the identity invariant still holds */
    }
  }

  private startTick() {
    if (this.tickTimer !== null || this.closed) return;
    this.tickTimer = (typeof window !== 'undefined' ? window : globalThis).setInterval(
      () => this.tick(),
      this.TICK_MS,
    ) as unknown as number;
  }

  private teardown() {
    this.closed = true;
    this.monitor?.stop();
    this.monitor = null;
    if (this.tickTimer !== null) {
      (typeof window !== 'undefined' ? window : globalThis).clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    if (this.videoEl) {
      try {
        this.videoEl.srcObject = null;
      } catch {
        /* ignore */
      }
    }
  }

  private async initDecoder() {
    try {
      this.decoder = await createFrameDecoder();
    } catch {
      this.decoder = null;
    }
  }

  /**
   * draw2 reachability + the Local-Network-Access warm (bug 1 fix). `stop()`
   * latches a monitor's `stopped=true` FOREVER, so "restart" means building a
   * FRESH monitor on the same options — never re-start()ing the dead one.
   */
  private initDraw2() {
    if (!this.draw2Url || !this.streamingEnabled) return;
    const url = this.draw2Url;
    // Read `this.authToken` (and the candidate origins) LIVE in the probe — in
    // proxy mode the token is fetched async and may land after this init, and the
    // reachable origin can flip if Tailscale is toggled; a live read means the very
    // next probe re-selects the right origin and streaming promotes on its own.
    // DUAL-ORIGIN: probe `draw2Url` + `draw2UrlFallback` in parallel and use
    // whichever `/health` answers (YGO 245's complementary on/off-tailnet origins).
    // Hub omits `draw2UrlFallback` → candidates = [draw2Url] → single-origin as before.
    const monitorOptions = {
      probe: async (timeoutMs: number) => {
        const candidates = [this.draw2Url, this.draw2UrlFallback].filter(Boolean) as string[];
        const reachable = await probeFirstReachable(candidates, timeoutMs, this.authToken);
        this.activeDraw2Url = reachable ?? this.activeDraw2Url;
        return !!reachable;
      },
      onChange: (reachable: boolean) => this.setStreaming(reachable),
    };
    this.monitor = new Draw2HealthMonitor(monitorOptions);
    this.monitor.start();
    // PROXY MODE (`authToken` set): draw2 is reached through the bucket-bot proxy
    // — a normal PUBLIC origin, so there is NO Chrome Local-Network-Access tailnet
    // prompt to warm. Skip the long-leash warm; the health monitor's probes (which
    // carry the bearer token) are enough.
    if (this.authToken) return;
    // Chrome LNA (direct-tailnet mode): if the tailnet permission is still at
    // 'prompt', the monitor's short-abort probes kill the prompt before it can be
    // answered and streaming latches off. Run the ONE long-leash warm; once draw2
    // actually answers, retire the (now-inert) monitor and start a FRESH one so it
    // re-probes on the granted permission.
    void warmDraw2Permission(url).then((ok) => {
      if (ok && !this.closed && !this.streaming) {
        this.monitor?.stop();
        this.monitor = new Draw2HealthMonitor(monitorOptions);
        this.monitor.start();
      }
    });
  }

  private setStreaming(reachable: boolean) {
    if (this.streaming === reachable) return;
    this.streaming = reachable;
    this.streamingChange.emit(reachable);
    if (!reachable) {
      // Demote: retract any live detection so a name nothing is refreshing
      // doesn't stay on screen. Barcode/QR keeps running.
      this.cardDetect.emit({ detection: null, source: null, scale: 1 });
    }
  }

  // ── frame helpers (the single copy) ──────────────────────────────────────

  /** Release a transient canvas's backing store — zeroing width/height frees the
   *  bitmap immediately instead of waiting on GC. Mobile Safari is quick to OOM on
   *  a long scan session that churns dozens of intermediate canvases per second, so
   *  we drop each INTERNAL canvas the core created AND fully consumes here. NEVER
   *  call this on a `source` canvas emitted to consumers (read async downstream). */
  private releaseCanvas(c: HTMLCanvasElement | null) {
    if (c) {
      try {
        c.width = 0;
        c.height = 0;
      } catch {
        /* ignore */
      }
    }
  }

  private grabFrameCanvas(scale = 1): HTMLCanvasElement | null {
    const v = this.videoEl;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /** Downscale a source canvas so its longest edge fits `maxEdge` →
   *  { canvas, scale (source/detect, to map a detect-space bbox back up) }. */
  private downscaleForDetect(
    src: HTMLCanvasElement,
    maxEdge = this.detectMaxEdge,
  ): { canvas: HTMLCanvasElement; scale: number } | null {
    const factor = detectScale(Math.max(src.width, src.height), maxEdge);
    const w = Math.max(1, Math.round(src.width * factor));
    const h = Math.max(1, Math.round(src.height * factor));
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, w, h);
    return { canvas: out, scale: src.width / w };
  }

  private cropFromBboxInternal(src: HTMLCanvasElement, bbox: number[]): string | null {
    if (bbox.length !== 4) return null;
    const x = Math.max(0, Math.min(Math.round(bbox[0]), src.width - 1));
    const y = Math.max(0, Math.min(Math.round(bbox[1]), src.height - 1));
    const w = Math.max(1, Math.min(Math.round(bbox[2]), src.width - x));
    const hgt = Math.max(1, Math.min(Math.round(bbox[3]), src.height - y));
    const outFactor = Math.min(1, this.cropMaxEdge / Math.max(w, hgt));
    const ow = Math.max(1, Math.round(w * outFactor));
    const oh = Math.max(1, Math.round(hgt * outFactor));
    const out = document.createElement('canvas');
    out.width = ow;
    out.height = oh;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, x, y, w, hgt, 0, 0, ow, oh);
    // Encode first, then release the transient crop canvas (the string is retained).
    const dataUrl = out.toDataURL('image/jpeg', 0.8);
    this.releaseCanvas(out);
    return dataUrl;
  }

  private frameJpegInternal(src: HTMLCanvasElement, maxEdge: number, quality: number): string | null {
    const scaled = this.downscaleForDetect(src, maxEdge);
    if (!scaled) return null;
    // Encode first, then release the transient scaled canvas (the string is retained).
    const dataUrl = scaled.canvas.toDataURL('image/jpeg', quality);
    this.releaseCanvas(scaled.canvas);
    return dataUrl;
  }

  /** Cheap frame-stability pre-gate: true once consecutive 32×32 frames barely
   *  change for ≥2 ticks (a settled, in-frame card). */
  private frameSteady(threshold = 6): boolean {
    const v = this.videoEl;
    if (!v?.videoWidth) return false;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(v, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data as unknown as Uint8ClampedArray;
    // The 32×32 sampling canvas is fully consumed — `data` is an independent copy.
    this.releaseCanvas(canvas);
    if (this.lastFrameData) {
      let diff = 0;
      for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i] - this.lastFrameData[i]);
      const avg = diff / (data.length / 4);
      if (avg < threshold) this.stableFrames++;
      else this.stableFrames = 0;
    }
    this.lastFrameData = data.slice();
    return this.stableFrames >= 2;
  }

  private async detectOnce(source: HTMLCanvasElement, minConfidence = 0): Promise<Draw2Detection | null> {
    const detect = this.downscaleForDetect(source);
    if (!detect) return null;
    // Encode the detect frame, then drop the transient downscale canvas — only the
    // dataURL rides to draw2; the source canvas is untouched (it may be emitted).
    const detectUrl = detect.canvas.toDataURL('image/jpeg', 0.7);
    this.releaseCanvas(detect.canvas);
    const dets = await draw2Detect(this.activeDraw2Url || this.draw2Url, detectUrl, undefined, this.authToken);
    return bestDetection(dets, minConfidence);
  }

  // ── tick loop (all modes ride ONE camera stack) ──────────────────────────

  private tick() {
    this.monitor?.tick(Date.now());
    const v = this.videoEl;
    if (!v?.videoWidth || this.closed) return;
    // Barcode/QR decode every tick (both modes; the decoder self-guards overlap).
    if (this.decoder) {
      void this.decoder.decode(v).then((value) => {
        if (value && !this.closed) this.barcodeDecode.emit({ value });
      });
    }
    if (this.busy) return;
    if (this.mode === 'scan') void this.tickScan();
    else if (this.streamingEnabled && this.streaming) void this.tickStreaming();
    else if (this.mode === 'capture') this.tickAutoCapture();
  }

  /** Scan mode: fast passive draw2 identify (no steadiness) → cardDetect. NEVER
   *  ingests; the consumer offers the name as a tap-to-search affordance. */
  private async tickScan() {
    if (!this.streamingEnabled || !this.streaming || this.streamBusy) return;
    if (Date.now() - this.lastDraw2At < this.SCAN_DETECT_INTERVAL_MS) return;
    this.streamBusy = true;
    try {
      this.lastDraw2At = Date.now();
      const source = this.grabFrameCanvas(1);
      if (!source) return;
      const det = await this.detectOnce(source, this.scanMinConfidence);
      // det may be null → the consumer retracts a stale candidate.
      this.cardDetect.emit({ detection: det, source, scale: 1 });
    } catch {
      /* graceful — drop this frame */
    } finally {
      this.streamBusy = false;
    }
  }

  /** Capture streaming: pre-gate (steady) → throttle → detect → identity-change
   *  gate → crop → emit `capture`. The gate latches only on settle(true). */
  private async tickStreaming(force = false) {
    if (this.streamBusy || !this.videoEl?.videoWidth) return;
    if (!force && !this.frameSteady()) return;
    if (!force && Date.now() - this.lastDraw2At < this.DRAW2_MIN_INTERVAL_MS) return;
    this.streamBusy = true;
    try {
      this.lastDraw2At = Date.now();
      const source = this.grabFrameCanvas(1);
      if (!source) {
        this.streamBusy = false;
        return;
      }
      const detect = this.downscaleForDetect(source);
      if (!detect) {
        this.streamBusy = false;
        return;
      }
      // Encode + release the transient downscale canvas before the round-trip;
      // detect.scale (a number) is still used below to map the bbox back to source.
      const detectUrl = detect.canvas.toDataURL('image/jpeg', 0.7);
      this.releaseCanvas(detect.canvas);
      const det = bestDetection(await draw2Detect(this.activeDraw2Url || this.draw2Url, detectUrl, undefined, this.authToken));
      this.cardDetect.emit({ detection: det, source, scale: detect.scale });
      if (!det) {
        this.streamBusy = false;
        return;
      }
      if (!force && !this.autoCapture) {
        this.streamBusy = false;
        return;
      }
      // Identity-CHANGE gate (the many-copies fix): auto-ingest ONLY when the
      // detection differs from the last ingested card. A forced tap bypasses it.
      if (!force && !this.gate.mayIngest(det.name, Date.now())) {
        this.streamBusy = false;
        return;
      }
      const crop = this.cropFromBboxInternal(source, scaleBbox(det.bbox, detect.scale));
      if (!crop) {
        this.streamBusy = false;
        return;
      }
      // Hand the crop to the consumer; keep streamBusy latched until it settles.
      this.emitCapture({ kind: 'stream', detection: det, source, scale: detect.scale, crop });
    } catch {
      this.streamBusy = false;
    }
  }

  /** Capture Phase-1 (draw2 down): a steady frame → emit a full-frame capture. */
  private tickAutoCapture() {
    if (!this.autoCapture || this.streamBusy || !this.videoEl?.videoWidth) return;
    if (this.frameSteady() && Date.now() - this.lastCaptureAt > 2500) {
      this.stableFrames = 0;
      this.runPhase1Capture();
    }
  }

  private runPhase1Capture() {
    if (this.streamBusy) return;
    const source = this.grabFrameCanvas(1);
    if (!source) return;
    this.streamBusy = true;
    this.emitCapture({ kind: 'phase1', detection: null, source, scale: 1, crop: null });
  }

  /** Emit a capture with a settle callback that releases the in-flight latch and
   *  records the appropriate cooldown/identity on success. */
  private emitCapture(base: Omit<CardCaptureDetail, 'settle'>) {
    let settled = false;
    // Safety net: streamBusy is latched until the consumer calls settle(). If a
    // consumer ever throws / drops the crop without settling, the scanner would
    // wedge (no further detect/capture ever runs). Force-release after 25s so the
    // loop always recovers; a normal settle clears the timer first.
    let watchdog: number | null = window.setTimeout(() => {
      watchdog = null;
      settle(false);
    }, 25000);
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (watchdog !== null) {
        window.clearTimeout(watchdog);
        watchdog = null;
      }
      if (ok) {
        if (base.kind === 'stream' && base.detection) this.gate.recordIngest(base.detection.name, Date.now());
        else if (base.kind === 'phase1') this.lastCaptureAt = Date.now();
      }
      this.streamBusy = false;
    };
    this.capture.emit({ ...base, settle });
  }

  // ── imperative helpers (consumers keep their own flows, no duplication) ────

  /** Grab the current full-res frame → canvas (or null). */
  @Method()
  async grabFrame(): Promise<HTMLCanvasElement | null> {
    return this.grabFrameCanvas(1);
  }

  /** Run the barcode/QR decoder on a canvas (default: the current video frame). */
  @Method()
  async decodeFrame(canvas?: HTMLCanvasElement): Promise<string | null> {
    if (!this.decoder) return null;
    const target = (canvas ?? this.videoEl) as HTMLVideoElement | undefined;
    if (!target) return null;
    return this.decoder.decode(target);
  }

  /** One draw2 detect on `source` → best pick above `minConfidence` (or null). */
  @Method()
  async detectFrame(source: HTMLCanvasElement, minConfidence = 0): Promise<Draw2Detection | null> {
    if (!this.draw2Url) return null;
    return this.detectOnce(source, minConfidence);
  }

  /** One draw2 detect on `source` PLUS the bbox crop mapped back to source pixels
   *  — the tap-to-add path (a confirmed still → identity + upload-ready crop). */
  @Method()
  async detectAndCrop(
    source: HTMLCanvasElement,
    minConfidence = 0,
  ): Promise<{ detection: Draw2Detection | null; crop: string | null }> {
    if (!this.draw2Url) return { detection: null, crop: null };
    const detect = this.downscaleForDetect(source);
    if (!detect) return { detection: null, crop: null };
    // Encode + release the transient downscale canvas; detect.scale still maps the
    // bbox back to source pixels for the crop below.
    const detectUrl = detect.canvas.toDataURL('image/jpeg', 0.7);
    this.releaseCanvas(detect.canvas);
    const det = bestDetection(await draw2Detect(this.activeDraw2Url || this.draw2Url, detectUrl, undefined, this.authToken), minConfidence);
    if (!det) return { detection: null, crop: null };
    const crop = this.cropFromBboxInternal(source, scaleBbox(det.bbox, detect.scale));
    return { detection: det, crop };
  }

  /** Crop a SOURCE-space bbox `[x,y,w,h]` out of `source` → a JPEG data URL. */
  @Method()
  async cropFromBbox(source: HTMLCanvasElement, bbox: number[]): Promise<string | null> {
    return this.cropFromBboxInternal(source, bbox);
  }

  /** Downscale `source` to `maxEdge` → a JPEG data URL (or null). */
  @Method()
  async frameJpeg(source: HTMLCanvasElement, maxEdge: number, quality: number): Promise<string | null> {
    return this.frameJpegInternal(source, maxEdge, quality);
  }

  /** Map a detect-space bbox up to source pixels (source/detect scale). */
  @Method()
  async scaleBboxToSource(bbox: number[], scale: number): Promise<number[]> {
    return scaleBbox(bbox, scale);
  }

  /** Force a capture NOW, bypassing the steadiness/interval/identity gates — the
   *  manual "add another copy" / shutter override. */
  @Method()
  async captureNow(): Promise<void> {
    if (this.mode !== 'capture') return;
    if (this.streamingEnabled && this.streaming) await this.tickStreaming(true);
    else this.runPhase1Capture();
  }

  /** Latch the identity gate after a manual/tap ingest so the auto loop won't
   *  immediately re-add the card the consumer just added. */
  @Method()
  async recordIngest(identity: string): Promise<void> {
    this.gate.recordIngest(identity, Date.now());
  }

  /** Forget the identity latch (destination changed / consumer reset). */
  @Method()
  async resetGate(): Promise<void> {
    this.gate.reset();
    this.stableFrames = 0;
  }

  /** Test/diagnostic hook: how many times the ref reattached the stream. */
  @Method()
  async getAttachCount(): Promise<number> {
    return this.attachCount;
  }

  // ── render: ONE stable <video>; extras/overlay/caption/footer are slots ────

  render() {
    return (
      <div class="pcs">
        {/* extras (capture-destination) sits ABOVE the viewport but OUTSIDE it,
            so toggling it can never reindex or blank the <video>. */}
        <slot name="extras" />
        <div class="pcs-viewport" style={this.videoAspect ? { aspectRatio: String(this.videoAspect) } : undefined}>
          <video
            class="pcs-video"
            ref={(el) => {
              this.videoEl = el as HTMLVideoElement;
              // Reattach on EVERY render whenever a stream exists — a re-render or
              // mode switch never blanks the viewfinder (bug 2 fixed by construction).
              this.attachStream(this.videoEl);
            }}
            onLoadedMetaData={() => {
              const v = this.videoEl;
              if (v?.videoWidth && v.videoHeight) this.videoAspect = v.videoWidth / v.videoHeight;
            }}
            muted
            playsInline
            autoplay
          />
          <slot name="overlay" />
          {this.cameraErrorText && <div class="pcs-error">{this.cameraErrorText}</div>}
        </div>
        <slot name="caption" />
        <slot />
      </div>
    );
  }
}
