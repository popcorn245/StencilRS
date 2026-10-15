import { Component, h, Prop, State, Event, EventEmitter } from '@stencil/core';

/**
 * pop-sync-status — a compact "Last synced <relative>" row + a refresh button,
 * for cache-first / stale-while-revalidate data panels. The relative label
 * auto-updates on an internal ~30s timer; the refresh icon spins while loading.
 *
 * Reusable: any panel that caches data can drop this in, pass its last-fetch
 * `syncedAt` + `loading`, and listen for `popRefresh` to force a revalidate.
 */
@Component({
  tag: 'pop-sync-status',
  encapsulation: { type: 'scoped' },
  styleUrl: 'sync-status.css',
})
export class PopSyncStatus {
  /** Last successful fetch time — epoch ms or an ISO string. */
  @Prop() syncedAt?: number | string;
  /** True while a refresh is in flight (spins the icon, disables the button). */
  @Prop() loading = false;
  /** Bare/inline variant: one chrome-less button — relative time as the label +
   *  the refresh icon, no background. For placing in a panel header top-right. */
  @Prop() bare = false;
  /**
   * Render the STALENESS LABEL ONLY — no refresh button, nothing clickable.
   *
   * For surfaces that keep "Nm ago" visible in a header but have moved the
   * manual refresh action somewhere else (the bucket-hub panel contract puts it
   * in the panel's `…` overflow menu). Splitting them keeps ONE component
   * owning the ~30s auto-updating relative label, instead of a second
   * implementation of that timer next to a standalone refresh button.
   */
  @Prop() labelOnly = false;

  /** Tick to re-render the relative label as time passes. */
  @State() private tick = 0;
  private timer?: ReturnType<typeof setInterval>;

  connectedCallback() {
    // Re-render every 30s so "just now" → "1m ago" without a prop change.
    this.timer = setInterval(() => { this.tick++; }, 30_000);
  }
  disconnectedCallback() {
    if (this.timer) clearInterval(this.timer);
  }

  /** popRefresh fires when the user taps the refresh button. */
  @Event({ composed: true, bubbles: true }) popRefresh!: EventEmitter<void>;

  /** Normalize syncedAt → epoch ms (or null). */
  private get syncedMs(): number | null {
    const v = this.syncedAt;
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? null : parsed;
  }

  /** Short relative label: "just now", "Nm ago", "Nh ago", "Nd ago", "Never". */
  private label(): string {
    void this.tick; // re-read on each timer tick
    const ms = this.syncedMs;
    if (ms == null) return 'Never';
    const diff = Math.max(0, Date.now() - ms);
    const sec = Math.floor(diff / 1000);
    if (sec < 45) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${Math.max(1, min)}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  render() {
    // Label only: a non-interactive staleness read-out. Not a <button>, so it
    // never lands in the tab order — the refresh action lives elsewhere and a
    // focusable element that does nothing would be a keyboard dead end.
    if (this.labelOnly) {
      return (
        <span
          class={{ 'ss-label-only': true, 'ss-label-only--spin': this.loading }}
          title={`Last synced ${this.label()}`}
        >
          <span class="ss-bare__label">{this.label()}</span>
          {this.loading && (
            <ion-icon class="ss-bare__icon" name="refresh-outline" aria-hidden="true" />
          )}
        </span>
      );
    }
    // Bare/inline: a single chrome-less button — "<relative>" + spinning refresh
    // icon, no background. Tapping it forces a refresh; the label auto-updates.
    if (this.bare) {
      return (
        <button
          class={{ 'ss-bare': true, 'ss-bare--spin': this.loading }}
          type="button"
          title="Refresh"
          aria-label={`Last synced ${this.label()} — refresh`}
          disabled={this.loading}
          onClick={() => this.popRefresh.emit()}
        >
          <span class="ss-bare__label">{this.label()}</span>
          <ion-icon class="ss-bare__icon" name="refresh-outline" aria-hidden="true" />
        </button>
      );
    }
    return (
      <div class="ss">
        <span class="ss__label">
          <ion-icon class="ss__clock" name="time-outline" aria-hidden="true" />
          Last synced {this.label()}
        </span>
        <button
          class={{ ss__refresh: true, 'ss__refresh--spin': this.loading }}
          type="button"
          title="Refresh"
          aria-label="Refresh"
          disabled={this.loading}
          onClick={() => this.popRefresh.emit()}
        >
          <ion-icon name="refresh-outline" aria-hidden="true" />
        </button>
      </div>
    );
  }
}
