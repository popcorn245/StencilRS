import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { Draw2HealthMonitor, ScanIngestGate } from '@popcorn245/cards-core';
import { bestDetection, detectScale, draw2Detect, probeFirstReachable, scaleBbox, warmDraw2Permission, } from '../../helpers/draw2';
import { createFrameDecoder } from '../../helpers/frame-decode';
import PopCardScannerStyle0 from "./ui-kit/organisms/card-scanner/card-scanner.css?tag=pop-card-scanner&encapsulation=scoped";
export const PopCardScanner = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.streamingChange = __stencil_createEvent(this, "streamingChange", 7);
        this.modeChange = __stencil_createEvent(this, "modeChange", 7);
        this.cardDetect = __stencil_createEvent(this, "cardDetect", 7);
        this.barcodeDecode = __stencil_createEvent(this, "barcodeDecode", 7);
        this.capture = __stencil_createEvent(this, "capture", 7);
        this.cameraError = __stencil_createEvent(this, "cameraError", 7);
        this.scannerClose = __stencil_createEvent(this, "scannerClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Mac draw2 service URL. '' → streaming disabled (barcode/QR + Phase-1 only).
     *  May be the tailnet draw2 host directly (hub) OR the bucket-bot draw2 PROXY
     *  base (`.../api/hub/cards/draw2`) when `authToken` is set (off-tailnet). */
    draw2Url = '';
    /** Optional SECONDARY draw2 proxy origin. When set, the scanner probes both
     *  `draw2Url` and `draw2UrlFallback` in parallel and uses whichever's `/health`
     *  is reachable — for YGO 245's complementary on/off-tailnet origins (the public
     *  Tailscale Funnel works only OFF the tailnet, `bot.popcorn245.com` only ON it),
     *  re-selecting live if connectivity flips. Hub omits it → unchanged
     *  single-origin (`draw2Url`) behavior. */
    draw2UrlFallback;
    /** Bearer token for the bot-PROXY draw2 mode (off-tailnet): when set, every
     *  draw2 health/detect call rides `Authorization: Bearer …` and the
     *  Local-Network-Access warm is skipped (the proxy is a normal PUBLIC origin,
     *  not a tailnet IP). Omitted (hub / direct-tailnet) → today's behavior. */
    authToken;
    /** Controlled mode — switching never restarts the camera or blanks the video. */
    mode = 'scan';
    /** Capture mode: auto-ingest a steady, NEW (identity-changed) card. */
    autoCapture = true;
    /** Consumer is mid round-trip (classify / recognize) — pause detect + capture. */
    busy = false;
    /** Allow streaming + passive detect at all (hub's barcode-only form → false). */
    streamingEnabled = true;
    /** Anti-hallucination floor (0–1) for the PASSIVE Scan-mode card detector. */
    scanMinConfidence = 0.6;
    /** Longest edge (px) of the frame POSTed to draw2 /detect (~1–2s vs ~6s). */
    detectMaxEdge = 640;
    /** Longest edge (px) cap on the uploaded crop — keeps the ingest body 413-safe. */
    cropMaxEdge = 1000;
    idealWidth = 2560;
    idealHeight = 1440;
    facingMode = 'environment';
    streamingChange;
    modeChange;
    cardDetect;
    barcodeDecode;
    capture;
    cameraError;
    scannerClose;
    /** draw2 reachable — passive detect + streaming ingest are live. */
    streaming = false;
    cameraErrorText = '';
    /** The stream's real aspect ratio → the viewport shows the FULL frame (no crop). */
    videoAspect = 0;
    videoEl;
    stream = null;
    monitor = null;
    /** The origin the last successful health probe selected (dual-origin mode) —
     *  detect calls target it so they hit whichever origin is currently reachable. */
    activeDraw2Url;
    gate = new ScanIngestGate({ cooldownMs: 1500 });
    decoder = null;
    tickTimer = null;
    /** One draw2/ingest round-trip at a time — don't spam the queue. */
    streamBusy = false;
    lastDraw2At = 0;
    lastCaptureAt = 0;
    lastFrameData = null;
    stableFrames = 0;
    closed = false;
    /** Reattach bookkeeping — the spec asserts the ref reattaches across renders. */
    attachCount = 0;
    DRAW2_MIN_INTERVAL_MS = 500;
    SCAN_DETECT_INTERVAL_MS = 900;
    TICK_MS = 350;
    // ── lifecycle ──────────────────────────────────────────────────────────────
    async componentDidLoad() {
        await this.openCamera();
        // The sheet may have closed while the permission prompt was up (openCamera
        // awaits getUserMedia) — bail before wiring the monitor / decoder / timer.
        if (this.closed)
            return;
        void this.initDecoder();
        this.initDraw2();
        // The tick loop only runs once a stream is live (openCamera starts it).
    }
    disconnectedCallback() {
        this.teardown();
    }
    onModeChange(next) {
        // Flip modes WITHOUT restarting the camera: just reset the detect/ingest
        // bookkeeping so a stale candidate or a mid-flip gate can't carry over.
        this.gate.reset();
        this.stableFrames = 0;
        this.streamBusy = false;
        this.lastFrameData = null;
        this.modeChange.emit(next);
    }
    // ── camera ───────────────────────────────────────────────────────────────
    async openCamera() {
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
        }
        catch {
            this.cameraErrorText = "I couldn't start the camera. Check camera permissions and try again.";
            this.teardown();
        }
    }
    /** (Re)attach the live stream to the single stable <video>. Idempotent — runs
     *  from the ref callback on EVERY render so a re-render or mode switch never
     *  blanks the viewfinder (bug 2 fix), and once after getUserMedia resolves. */
    attachStream(el) {
        if (!el || !this.stream)
            return;
        if (el.srcObject === this.stream)
            return;
        try {
            el.srcObject = this.stream;
            this.attachCount++;
            void el.play?.().catch(() => undefined);
        }
        catch {
            /* jsdom / unsupported — the identity invariant still holds */
        }
    }
    startTick() {
        if (this.tickTimer !== null || this.closed)
            return;
        this.tickTimer = (typeof window !== 'undefined' ? window : globalThis).setInterval(() => this.tick(), this.TICK_MS);
    }
    teardown() {
        this.closed = true;
        this.monitor?.stop();
        this.monitor = null;
        if (this.tickTimer !== null) {
            (typeof window !== 'undefined' ? window : globalThis).clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
        if (this.stream) {
            for (const t of this.stream.getTracks())
                t.stop();
            this.stream = null;
        }
        if (this.videoEl) {
            try {
                this.videoEl.srcObject = null;
            }
            catch {
                /* ignore */
            }
        }
    }
    async initDecoder() {
        try {
            this.decoder = await createFrameDecoder();
        }
        catch {
            this.decoder = null;
        }
    }
    /**
     * draw2 reachability + the Local-Network-Access warm (bug 1 fix). `stop()`
     * latches a monitor's `stopped=true` FOREVER, so "restart" means building a
     * FRESH monitor on the same options — never re-start()ing the dead one.
     */
    initDraw2() {
        if (!this.draw2Url || !this.streamingEnabled)
            return;
        const url = this.draw2Url;
        // Read `this.authToken` (and the candidate origins) LIVE in the probe — in
        // proxy mode the token is fetched async and may land after this init, and the
        // reachable origin can flip if Tailscale is toggled; a live read means the very
        // next probe re-selects the right origin and streaming promotes on its own.
        // DUAL-ORIGIN: probe `draw2Url` + `draw2UrlFallback` in parallel and use
        // whichever `/health` answers (YGO 245's complementary on/off-tailnet origins).
        // Hub omits `draw2UrlFallback` → candidates = [draw2Url] → single-origin as before.
        const monitorOptions = {
            probe: async (timeoutMs) => {
                const candidates = [this.draw2Url, this.draw2UrlFallback].filter(Boolean);
                const reachable = await probeFirstReachable(candidates, timeoutMs, this.authToken);
                this.activeDraw2Url = reachable ?? this.activeDraw2Url;
                return !!reachable;
            },
            onChange: (reachable) => this.setStreaming(reachable),
        };
        this.monitor = new Draw2HealthMonitor(monitorOptions);
        this.monitor.start();
        // PROXY MODE (`authToken` set): draw2 is reached through the bucket-bot proxy
        // — a normal PUBLIC origin, so there is NO Chrome Local-Network-Access tailnet
        // prompt to warm. Skip the long-leash warm; the health monitor's probes (which
        // carry the bearer token) are enough.
        if (this.authToken)
            return;
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
    setStreaming(reachable) {
        if (this.streaming === reachable)
            return;
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
    releaseCanvas(c) {
        if (c) {
            try {
                c.width = 0;
                c.height = 0;
            }
            catch {
                /* ignore */
            }
        }
    }
    grabFrameCanvas(scale = 1) {
        const v = this.videoEl;
        if (!v || !v.videoWidth)
            return null;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        return canvas;
    }
    /** Downscale a source canvas so its longest edge fits `maxEdge` →
     *  { canvas, scale (source/detect, to map a detect-space bbox back up) }. */
    downscaleForDetect(src, maxEdge = this.detectMaxEdge) {
        const factor = detectScale(Math.max(src.width, src.height), maxEdge);
        const w = Math.max(1, Math.round(src.width * factor));
        const h = Math.max(1, Math.round(src.height * factor));
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(src, 0, 0, w, h);
        return { canvas: out, scale: src.width / w };
    }
    cropFromBboxInternal(src, bbox) {
        if (bbox.length !== 4)
            return null;
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
        if (!ctx)
            return null;
        ctx.drawImage(src, x, y, w, hgt, 0, 0, ow, oh);
        // Encode first, then release the transient crop canvas (the string is retained).
        const dataUrl = out.toDataURL('image/jpeg', 0.8);
        this.releaseCanvas(out);
        return dataUrl;
    }
    frameJpegInternal(src, maxEdge, quality) {
        const scaled = this.downscaleForDetect(src, maxEdge);
        if (!scaled)
            return null;
        // Encode first, then release the transient scaled canvas (the string is retained).
        const dataUrl = scaled.canvas.toDataURL('image/jpeg', quality);
        this.releaseCanvas(scaled.canvas);
        return dataUrl;
    }
    /** Cheap frame-stability pre-gate: true once consecutive 32×32 frames barely
     *  change for ≥2 ticks (a settled, in-frame card). */
    frameSteady(threshold = 6) {
        const v = this.videoEl;
        if (!v?.videoWidth)
            return false;
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return false;
        ctx.drawImage(v, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        // The 32×32 sampling canvas is fully consumed — `data` is an independent copy.
        this.releaseCanvas(canvas);
        if (this.lastFrameData) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 4)
                diff += Math.abs(data[i] - this.lastFrameData[i]);
            const avg = diff / (data.length / 4);
            if (avg < threshold)
                this.stableFrames++;
            else
                this.stableFrames = 0;
        }
        this.lastFrameData = data.slice();
        return this.stableFrames >= 2;
    }
    async detectOnce(source, minConfidence = 0) {
        const detect = this.downscaleForDetect(source);
        if (!detect)
            return null;
        // Encode the detect frame, then drop the transient downscale canvas — only the
        // dataURL rides to draw2; the source canvas is untouched (it may be emitted).
        const detectUrl = detect.canvas.toDataURL('image/jpeg', 0.7);
        this.releaseCanvas(detect.canvas);
        const dets = await draw2Detect(this.activeDraw2Url || this.draw2Url, detectUrl, undefined, this.authToken);
        return bestDetection(dets, minConfidence);
    }
    // ── tick loop (all modes ride ONE camera stack) ──────────────────────────
    tick() {
        this.monitor?.tick(Date.now());
        const v = this.videoEl;
        if (!v?.videoWidth || this.closed)
            return;
        // Barcode/QR decode every tick (both modes; the decoder self-guards overlap).
        if (this.decoder) {
            void this.decoder.decode(v).then((value) => {
                if (value && !this.closed)
                    this.barcodeDecode.emit({ value });
            });
        }
        if (this.busy)
            return;
        if (this.mode === 'scan')
            void this.tickScan();
        else if (this.streamingEnabled && this.streaming)
            void this.tickStreaming();
        else if (this.mode === 'capture')
            this.tickAutoCapture();
    }
    /** Scan mode: fast passive draw2 identify (no steadiness) → cardDetect. NEVER
     *  ingests; the consumer offers the name as a tap-to-search affordance. */
    async tickScan() {
        if (!this.streamingEnabled || !this.streaming || this.streamBusy)
            return;
        if (Date.now() - this.lastDraw2At < this.SCAN_DETECT_INTERVAL_MS)
            return;
        this.streamBusy = true;
        try {
            this.lastDraw2At = Date.now();
            const source = this.grabFrameCanvas(1);
            if (!source)
                return;
            const det = await this.detectOnce(source, this.scanMinConfidence);
            // det may be null → the consumer retracts a stale candidate.
            this.cardDetect.emit({ detection: det, source, scale: 1 });
        }
        catch {
            /* graceful — drop this frame */
        }
        finally {
            this.streamBusy = false;
        }
    }
    /** Capture streaming: pre-gate (steady) → throttle → detect → identity-change
     *  gate → crop → emit `capture`. The gate latches only on settle(true). */
    async tickStreaming(force = false) {
        if (this.streamBusy || !this.videoEl?.videoWidth)
            return;
        if (!force && !this.frameSteady())
            return;
        if (!force && Date.now() - this.lastDraw2At < this.DRAW2_MIN_INTERVAL_MS)
            return;
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
        }
        catch {
            this.streamBusy = false;
        }
    }
    /** Capture Phase-1 (draw2 down): a steady frame → emit a full-frame capture. */
    tickAutoCapture() {
        if (!this.autoCapture || this.streamBusy || !this.videoEl?.videoWidth)
            return;
        if (this.frameSteady() && Date.now() - this.lastCaptureAt > 2500) {
            this.stableFrames = 0;
            this.runPhase1Capture();
        }
    }
    runPhase1Capture() {
        if (this.streamBusy)
            return;
        const source = this.grabFrameCanvas(1);
        if (!source)
            return;
        this.streamBusy = true;
        this.emitCapture({ kind: 'phase1', detection: null, source, scale: 1, crop: null });
    }
    /** Emit a capture with a settle callback that releases the in-flight latch and
     *  records the appropriate cooldown/identity on success. */
    emitCapture(base) {
        let settled = false;
        // Safety net: streamBusy is latched until the consumer calls settle(). If a
        // consumer ever throws / drops the crop without settling, the scanner would
        // wedge (no further detect/capture ever runs). Force-release after 25s so the
        // loop always recovers; a normal settle clears the timer first.
        let watchdog = window.setTimeout(() => {
            watchdog = null;
            settle(false);
        }, 25000);
        const settle = (ok) => {
            if (settled)
                return;
            settled = true;
            if (watchdog !== null) {
                window.clearTimeout(watchdog);
                watchdog = null;
            }
            if (ok) {
                if (base.kind === 'stream' && base.detection)
                    this.gate.recordIngest(base.detection.name, Date.now());
                else if (base.kind === 'phase1')
                    this.lastCaptureAt = Date.now();
            }
            this.streamBusy = false;
        };
        this.capture.emit({ ...base, settle });
    }
    // ── imperative helpers (consumers keep their own flows, no duplication) ────
    /** Grab the current full-res frame → canvas (or null). */
    async grabFrame() {
        return this.grabFrameCanvas(1);
    }
    /** Run the barcode/QR decoder on a canvas (default: the current video frame). */
    async decodeFrame(canvas) {
        if (!this.decoder)
            return null;
        const target = (canvas ?? this.videoEl);
        if (!target)
            return null;
        return this.decoder.decode(target);
    }
    /** One draw2 detect on `source` → best pick above `minConfidence` (or null). */
    async detectFrame(source, minConfidence = 0) {
        if (!this.draw2Url)
            return null;
        return this.detectOnce(source, minConfidence);
    }
    /** One draw2 detect on `source` PLUS the bbox crop mapped back to source pixels
     *  — the tap-to-add path (a confirmed still → identity + upload-ready crop). */
    async detectAndCrop(source, minConfidence = 0) {
        if (!this.draw2Url)
            return { detection: null, crop: null };
        const detect = this.downscaleForDetect(source);
        if (!detect)
            return { detection: null, crop: null };
        // Encode + release the transient downscale canvas; detect.scale still maps the
        // bbox back to source pixels for the crop below.
        const detectUrl = detect.canvas.toDataURL('image/jpeg', 0.7);
        this.releaseCanvas(detect.canvas);
        const det = bestDetection(await draw2Detect(this.activeDraw2Url || this.draw2Url, detectUrl, undefined, this.authToken), minConfidence);
        if (!det)
            return { detection: null, crop: null };
        const crop = this.cropFromBboxInternal(source, scaleBbox(det.bbox, detect.scale));
        return { detection: det, crop };
    }
    /** Crop a SOURCE-space bbox `[x,y,w,h]` out of `source` → a JPEG data URL. */
    async cropFromBbox(source, bbox) {
        return this.cropFromBboxInternal(source, bbox);
    }
    /** Downscale `source` to `maxEdge` → a JPEG data URL (or null). */
    async frameJpeg(source, maxEdge, quality) {
        return this.frameJpegInternal(source, maxEdge, quality);
    }
    /** Map a detect-space bbox up to source pixels (source/detect scale). */
    async scaleBboxToSource(bbox, scale) {
        return scaleBbox(bbox, scale);
    }
    /** Force a capture NOW, bypassing the steadiness/interval/identity gates — the
     *  manual "add another copy" / shutter override. */
    async captureNow() {
        if (this.mode !== 'capture')
            return;
        if (this.streamingEnabled && this.streaming)
            await this.tickStreaming(true);
        else
            this.runPhase1Capture();
    }
    /** Latch the identity gate after a manual/tap ingest so the auto loop won't
     *  immediately re-add the card the consumer just added. */
    async recordIngest(identity) {
        this.gate.recordIngest(identity, Date.now());
    }
    /** Forget the identity latch (destination changed / consumer reset). */
    async resetGate() {
        this.gate.reset();
        this.stableFrames = 0;
    }
    /** Test/diagnostic hook: how many times the ref reattached the stream. */
    async getAttachCount() {
        return this.attachCount;
    }
    // ── render: ONE stable <video>; extras/overlay/caption/footer are slots ────
    render() {
        return (h("div", { key: '0', class: "pcs" },
            h("slot", { key: '1', name: "extras" }),
            h("div", { key: '2', class: "pcs-viewport", style: this.videoAspect ? { aspectRatio: String(this.videoAspect) } : undefined },
                h("video", { key: '3', class: "pcs-video", ref: (el) => {
                        this.videoEl = el;
                        // Reattach on EVERY render whenever a stream exists — a re-render or
                        // mode switch never blanks the viewfinder (bug 2 fixed by construction).
                        this.attachStream(this.videoEl);
                    }, onLoadedMetaData: () => {
                        const v = this.videoEl;
                        if (v?.videoWidth && v.videoHeight)
                            this.videoAspect = v.videoWidth / v.videoHeight;
                    }, muted: true, playsInline: true, autoplay: true }),
                h("slot", { key: '4', name: "overlay" }),
                this.cameraErrorText && h("div", { key: '5', class: "pcs-error" }, this.cameraErrorText)),
            h("slot", { key: '6', name: "caption" }),
            h("slot", { key: '7' })));
    }
    static get watchers() { return {
        "mode": [{
                "onModeChange": 0
            }]
    }; }
};
PopCardScanner.style = PopCardScannerStyle0();
//# sourceMappingURL=card-scanner.js.map