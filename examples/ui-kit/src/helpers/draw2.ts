/**
 * draw2 client (Yu-Gi-Oh streaming scan, Phase 2) — the ONE shared client for
 * `pop-card-scanner`. The PHONE calls the Mac draw2 FastAPI GPU service DIRECTLY
 * over Tailscale (NOT proxied through the bot; S2). It gives a live identity +
 * bbox only (never a set code / price — that's the worker's Gemini job). See docs
 * bucket-bot/yugioh-streaming-scan/architecture-and-data-flow
 * §the-draw2-service-contract.
 *
 * Both network calls are graceful: a timeout, an unreachable host (wrong tailnet),
 * or a non-200 degrades to "no detection" / "unhealthy" so the capture surface can
 * fall back to the Phase 1 single-capture flow. This module holds ONLY the thin
 * contract; the FastAPI wrapper itself is an ops deliverable on the Mac.
 *
 * CONSOLIDATION: this is the single copy that used to be duplicated in
 * bucket-hub/src/api/draw2.ts and yugioh-app/src/api/draw2.ts. It is the superset
 * — it carries the `warmDraw2Permission()` Chrome Local-Network-Access long-leash
 * probe that the hub copy lacked (the "Hold up a card, nothing detected" bug). It
 * lives in ui-kit alongside the scanner rather than in framework-free cards-core
 * (which deliberately holds no I/O) — cards-core still owns the Draw2HealthMonitor
 * state machine this feeds.
 */

export interface Draw2Detection {
  /** The classified card name (draw2's ~13k-card label set). */
  name: string;
  /** Classifier confidence (0–1). */
  confidence: number;
  /** `[x, y, w, h]` in frame pixels — the phone crops from this. */
  bbox: number[];
  /** 8-digit passcode when draw2's label carries one (digits only) — forwarded to
   *  the scan ingest as a resolution seed. Absent for label sets without it. */
  passcode?: string;
}

function base(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Optional bearer auth for the BOT-PROXY mode. When `draw2Url` points at the
 * bucket-bot draw2 proxy base (`.../api/hub/cards/draw2`) instead of the tailnet
 * draw2 host directly, the proxy is behind the bot's `requireHub` (Firebase ID
 * token + allowlist), so callers pass an `authToken` and it rides as
 * `Authorization: Bearer …`. Omitted (hub / direct-tailnet mode) → no header,
 * today's behavior unchanged.
 */
function authHeaders(authToken?: string): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

/**
 * Reachability probe (`GET {url}/health`). A 200 selects streaming mode; anything
 * else (timeout / unreachable / non-200) selects the Phase 1 fallback. Empty url →
 * false (streaming disabled). `authToken` (optional, LAST arg) authenticates the
 * bot-proxy mode; direct-tailnet callers omit it.
 */
export async function draw2Health(url: string, timeoutMs = 2500, authToken?: string): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(`${base(url)}/health`, {
      headers: authHeaders(authToken),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Race `draw2Health` across several candidate draw2 origins in PARALLEL and
 * resolve with the FIRST url whose health returns true — or `null` when every
 * candidate fails (never rejects). This is the dual-origin seam for YGO 245: the
 * scanner reaches the bot draw2 proxy through TWO complementary origins — the
 * public Tailscale Funnel (works ONLY off the tailnet) and the tailnet host
 * (works ONLY on it) — so it probes both and uses whichever is reachable, and
 * re-selects live if connectivity flips (Tailscale toggled). Empty / duplicate
 * urls are skipped; `authToken` (optional, LAST arg) authenticates the bot-proxy
 * mode. The hub passes a single origin → this simply returns that one (or null).
 */
export async function probeFirstReachable(
  urls: string[],
  timeoutMs = 2500,
  authToken?: string,
): Promise<string | null> {
  const candidates = [...new Set(urls.filter(Boolean))];
  if (!candidates.length) return null;
  return new Promise<string | null>((resolve) => {
    let pending = candidates.length;
    for (const url of candidates) {
      void draw2Health(url, timeoutMs, authToken).then((ok) => {
        if (ok) resolve(url);
        else if (--pending === 0) resolve(null);
      });
    }
  });
}

/**
 * Chrome 138+ Local Network Access: draw2 resolves to a tailnet (100.x) IP, so
 * a fetch from this PUBLIC origin needs the per-origin `local-network-access`
 * permission. While it's in `prompt` state Chrome holds the request on a user
 * prompt — and the health probe's short AbortSignal kills the request (and the
 * prompt with it) before anyone can answer, latching the scanner into the
 * Phase 1 fallback forever. This warm runs ONE long-leash probe (60s, no
 * short abort) so the prompt can actually be shown and answered. Resolves true
 * when draw2 answered (permission granted or not needed); false on deny/
 * unreachable/unsupported — callers just re-probe on true. Never throws.
 */
export async function warmDraw2Permission(url: string, authToken?: string): Promise<boolean> {
  if (!url) return false;
  try {
    const query = navigator.permissions?.query?.bind(navigator.permissions);
    if (query) {
      const perm = await query({ name: 'local-network-access' as PermissionName }).catch(() => null);
      if (perm && perm.state === 'granted') return true;
      if (perm && perm.state === 'denied') return false;
      // 'prompt' (or unqueryable) → fall through to the long-leash fetch.
    }
    const res = await fetch(`${base(url)}/health`, {
      headers: authHeaders(authToken),
      signal: AbortSignal.timeout(60000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * `POST {url}/detect {image}` → detections. Never throws; returns [] on a timeout,
 * an unreachable host, or a non-200 (the caller drops that frame). `image` is a
 * base64 / data: URL of a single camera frame.
 *
 * `timeoutMs` defaults to 7000: a busy-shed response returns in ~10ms and a real
 * detect is ~0.6–3s, so 7s tolerates a slow proxy hop without prematurely aborting
 * (which would orphan the server's in-flight detect work). The health/warm probes
 * keep their own shorter timeouts — this only widens the per-frame detect window.
 */
export async function draw2Detect(
  url: string,
  image: string,
  timeoutMs = 7000,
  authToken?: string,
): Promise<Draw2Detection[]> {
  if (!url || !image) return [];
  try {
    const res = await fetch(`${base(url)}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(authToken) },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { detections?: unknown };
    const dets = Array.isArray(json?.detections) ? json.detections : [];
    return dets
      .map((d): Draw2Detection => {
        const o = (d ?? {}) as Record<string, unknown>;
        const passcode = String(o.passcode ?? '').replace(/\D/g, '');
        return {
          name: String(o.name ?? '').trim(),
          confidence: Number(o.confidence) || 0,
          bbox: Array.isArray(o.bbox) ? o.bbox.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
          ...(passcode ? { passcode } : {}),
        };
      })
      .filter((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Pick the highest-confidence detection whose bbox is usable (or null).
 * `minConfidence` (0–1) drops detections the caller considers too weak to act
 * on; it defaults to 0, so a caller that wants draw2's raw top pick — however
 * marginal — simply omits it.
 */
export function bestDetection(detections: Draw2Detection[], minConfidence = 0): Draw2Detection | null {
  const usable = detections.filter((d) => d.name && d.bbox.length === 4 && d.confidence >= minConfidence);
  if (!usable.length) return null;
  return [...usable].sort((a, b) => b.confidence - a.confidence)[0];
}

/**
 * The downscale factor to fit a frame's `longestEdge` under `maxEdge` (never
 * upscales — a small frame stays 1). We send draw2 a downscaled frame (detect on
 * a full ~1080px frame is ~6s on the Mac MPS GPU; ~640px is ~1–2s).
 */
export function detectScale(longestEdge: number, maxEdge: number): number {
  return longestEdge > maxEdge ? maxEdge / longestEdge : 1;
}

/**
 * Map a bbox from the DOWNSCALED detect-frame back to the source frame we crop
 * from. `scale` is source/detect (the reciprocal of `detectScale`), so the bbox is
 * scaled UP to source-resolution pixels — never letting the downscale desync the
 * bbox→crop mapping. draw2 returns bbox in the coordinates of the frame we sent it.
 */
export function scaleBbox(bbox: number[], scale: number): number[] {
  return bbox.map((v) => v * scale);
}
