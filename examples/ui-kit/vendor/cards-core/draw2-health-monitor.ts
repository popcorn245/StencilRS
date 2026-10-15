/**
 * draw2 reachability lifecycle for the unified scanner — background open-time
 * probe (long first timeout + one retry) plus a periodic re-probe that both
 * PROMOTES (false→true) and demotes (true→false).
 *
 * The bug this replaces (passive Scan-mode card detect dead for a whole
 * session while tap-to-identify worked fine): `openScanner` ran ONE awaited
 * `draw2Health` probe with a 2.5s timeout. A phone's cold DNS + TLS handshake
 * to draw2 routinely outruns 2.5s, so the probe timed out, `streaming` latched
 * false, and the only other health check sat BELOW the `!this.streaming` bail
 * in the tick — it could only demote, never recover. One slow handshake at
 * open = no passive card detect until the sheet was reopened (and the await
 * also delayed the camera start by up to the timeout).
 *
 * The rules now:
 *
 *   • `start()` never blocks the scanner opening — it fires the probe in the
 *     background with a LONG first timeout (cold handshake budget) and, on
 *     failure, one retry after a short delay before concluding unreachable.
 *   • `tick(now)` runs from the scanner's interval loop REGARDLESS of the
 *     current verdict, re-probing every `recheckMs` with the cheap steady
 *     timeout, and flips the verdict in either direction.
 *   • Probes never stack: an in-flight probe (initial or periodic) makes
 *     `tick` a no-op until it settles.
 *   • `onChange` fires only when the verdict actually flips; `stop()` (scanner
 *     closed) makes any late-settling probe inert.
 */

export interface Draw2HealthMonitorOptions {
  /** Runs one `GET /health` probe with the given timeout; resolves reachable?
   *  Must never reject (api/draw2.ts `draw2Health` already guarantees that). */
  probe: (timeoutMs: number) => Promise<boolean>;
  /** Called when the reachability verdict FLIPS (promote or demote). */
  onChange: (reachable: boolean) => void;
  /** Timeout for the open-time probe attempts (cold DNS + TLS budget). */
  firstTimeoutMs?: number;
  /** Pause between the open-time probe's first attempt and its one retry. */
  retryDelayMs?: number;
  /** Timeout for the periodic re-probes (connection is warm by then). */
  recheckTimeoutMs?: number;
  /** How often `tick` actually re-probes. */
  recheckMs?: number;
  /** Injectable sleep (tests pass an instant resolver). */
  delay?: (ms: number) => Promise<void>;
}

const DEFAULT_FIRST_TIMEOUT_MS = 6000;
const DEFAULT_RETRY_DELAY_MS = 2000;
const DEFAULT_RECHECK_TIMEOUT_MS = 2500;
const DEFAULT_RECHECK_MS = 10_000;

export class Draw2HealthMonitor {
  /** The current verdict — starts pessimistic until the first probe settles. */
  reachable = false;

  private readonly probe: (timeoutMs: number) => Promise<boolean>;
  private readonly onChange: (reachable: boolean) => void;
  private readonly firstTimeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly recheckTimeoutMs: number;
  private readonly recheckMs: number;
  private readonly delay: (ms: number) => Promise<void>;

  /** One probe at a time — `tick` no-ops while any probe is in flight. */
  private inFlight = false;
  private stopped = false;
  /** When the last probe STARTED (ms epoch) — paces the periodic re-probe. */
  private lastProbeAt = -Infinity;

  constructor(opts: Draw2HealthMonitorOptions) {
    this.probe = opts.probe;
    this.onChange = opts.onChange;
    this.firstTimeoutMs = opts.firstTimeoutMs ?? DEFAULT_FIRST_TIMEOUT_MS;
    this.retryDelayMs = opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.recheckTimeoutMs = opts.recheckTimeoutMs ?? DEFAULT_RECHECK_TIMEOUT_MS;
    this.recheckMs = opts.recheckMs ?? DEFAULT_RECHECK_MS;
    this.delay = opts.delay ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /**
   * Fire the open-time probe in the BACKGROUND (never await this from the
   * open path): long first timeout, one retry after `retryDelayMs`, verdict
   * via `onChange` whenever it settles — even if ticks already started.
   */
  start(now: number = Date.now()): void {
    if (this.inFlight || this.stopped) return;
    this.inFlight = true;
    this.lastProbeAt = now;
    void (async () => {
      try {
        let ok = await this.probe(this.firstTimeoutMs);
        if (!ok && !this.stopped) {
          await this.delay(this.retryDelayMs);
          if (this.stopped) return;
          ok = await this.probe(this.firstTimeoutMs);
        }
        this.conclude(ok);
      } finally {
        this.inFlight = false;
      }
    })();
  }

  /**
   * Periodic re-probe, driven by the scanner's tick loop. Runs regardless of
   * the current verdict (so it PROMOTES as well as demotes), at most once per
   * `recheckMs`, and never while another probe is in flight.
   */
  tick(now: number): void {
    if (this.inFlight || this.stopped) return;
    if (now - this.lastProbeAt < this.recheckMs) return;
    this.inFlight = true;
    this.lastProbeAt = now;
    void this.probe(this.recheckTimeoutMs)
      .then((ok) => this.conclude(ok))
      .finally(() => {
        this.inFlight = false;
      });
  }

  /** Scanner closed — any probe still in flight settles inertly. */
  stop(): void {
    this.stopped = true;
  }

  private conclude(ok: boolean): void {
    if (this.stopped) return;
    const flipped = ok !== this.reachable;
    this.reachable = ok;
    if (flipped) this.onChange(ok);
  }
}
