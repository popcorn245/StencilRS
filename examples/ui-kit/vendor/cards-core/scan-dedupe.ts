/**
 * Streaming-scan identity-CHANGE gate — decides whether a draw2 detection in
 * Card Capture should AUTO-INGEST.
 *
 * The bug this replaces (a handheld session logged MANY copies of one card):
 * the previous machine re-armed on ABSENCE — an identity not seen for ≥2.5s
 * was assumed to have left the frame. Handheld, draw2 detection flickers
 * (motion blur → missed detections for seconds while the card is physically
 * still up), so the "absence" re-arm fired over and over and each re-arm
 * re-ingested the same card. Time-based re-arming can't be made flicker-proof.
 *
 * The rule now: auto-ingest happens only on an identity CHANGE.
 *
 *   • Track the identity of the LAST auto-added card (`lastIngestedIdentity`).
 *   • A confident detection auto-ingests ONLY when it differs from that —
 *     the same card seen again (after any gap, flicker, or re-steadying)
 *     NEVER re-adds.
 *   • A minimal safety cooldown (~1.5s) after any ingest absorbs the
 *     transition frame between two physical cards (draw2 can report the new
 *     card while the old one is still half in frame).
 *   • Duplicates ON PURPOSE go through the explicit "+1" affordance on the
 *     added log (or a manual tap-capture, which BYPASSES this gate) — never
 *     through the auto loop.
 *
 * `mayIngest` is a PURE check; the caller records a successful ingest with
 * `recordIngest` (so a failed upload doesn't latch the identity and the card
 * stays eligible for retry). Manual/tap adds also record, so the auto loop
 * won't immediately re-add the card the user just tapped in.
 */

export interface ScanIngestGateOptions {
  /** Minimum ms since the last ingest before ANY identity may auto-ingest. */
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 1500;

export class ScanIngestGate {
  private readonly cooldownMs: number;
  /** The draw2 identity of the last ingested card, or null (nothing yet). */
  private lastIngestedIdentity: string | null = null;
  /** When the last ingest happened (ms epoch); -Infinity = never. */
  private lastIngestAt = -Infinity;

  constructor(opts: ScanIngestGateOptions = {}) {
    this.cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  /**
   * May `identity` AUTO-ingest at `now`? True only when it DIFFERS from the
   * last ingested identity and the safety cooldown has elapsed. Pure — call
   * `recordIngest` after the ingest actually succeeds.
   */
  mayIngest(identity: string, now: number): boolean {
    if (now - this.lastIngestAt < this.cooldownMs) return false;
    return identity !== this.lastIngestedIdentity;
  }

  /** Latch a SUCCESSFUL ingest (auto or manual/tap) of `identity` at `now`. */
  recordIngest(identity: string, now: number): void {
    this.lastIngestedIdentity = identity;
    this.lastIngestAt = now;
  }

  /** Forget the latch (scanner closed / mode switched / destination changed). */
  reset(): void {
    this.lastIngestedIdentity = null;
    this.lastIngestAt = -Infinity;
  }
}
