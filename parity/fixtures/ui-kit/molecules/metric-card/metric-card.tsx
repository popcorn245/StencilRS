import { Component, Prop, Event, EventEmitter, h, Host } from '@stencil/core';

/**
 * pop-metric-card — a reusable stat tile (molecule).
 *
 * A compact card showing an emoji/glyph, a title, a big value and an optional
 * sub-line. When `loggable`, the card doubles as a LOG ENTRY POINT: it grows a
 * subtle "+" badge (top-right) that turns brand-blue on hover/focus and rotates
 * to a "✕" when `active`, plus a "Tap to log" hint that slides up on hover. The
 * whole card is a button that emits `popCardTap` with its `cardKey` — the host
 * decides what to do (e.g. open a log form, drill into a detail sheet).
 *
 * Intentionally presentation-only and domain-agnostic: it knows nothing about
 * Fit, Popcoin or Inventory — the host hands it a glyph + strings and listens
 * for taps. Reuse it anywhere a tappable stat tile is wanted.
 */
@Component({
  tag: 'pop-metric-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'metric-card.css',
})
export class PopMetricCard {
  /** The emoji / glyph shown before the title (e.g. "⚖️"). Kept as a literal
   *  glyph by design — this is NOT a pop-icon slot. */
  @Prop() glyph = '';
  /** The card title (e.g. "Weight"). */
  @Prop() label = '';
  /** The big value (e.g. "150.7 lbs"). Rendered on one line where it fits. */
  @Prop() value = '';
  /** Optional sub-line under the value (e.g. "Jul 15" or "of 2,000 goal"). */
  @Prop() sub = '';
  /** Highlighted/pressed state — e.g. the card whose log form is open, or the
   *  one just logged. Rotates the "+" badge to a "✕". */
  @Prop() active = false;
  /** Shows the tap-to-log affordance (the "+" badge + "Tap to log" hint). Off →
   *  the card is a plain (still tappable) stat tile. */
  @Prop() loggable = false;
  /** Identity emitted with `popCardTap` so a host with many cards knows which
   *  one was tapped. Defaults to the label when unset. */
  @Prop() cardKey = '';

  /** Fires when the card is tapped — detail is the card's `cardKey` (or label). */
  @Event({ composed: true, bubbles: true }) popCardTap!: EventEmitter<string>;

  private onTap = () => {
    this.popCardTap.emit(this.cardKey || this.label);
  };

  render() {
    return (
      <Host>
        <button
          type="button"
          class={{ mc: true, 'mc--on': this.active, 'mc--loggable': this.loggable }}
          aria-pressed={this.loggable ? String(this.active) : undefined}
          onClick={this.onTap}
        >
          {this.loggable && (
            <span class="mc__plus" aria-hidden="true">
              +
            </span>
          )}
          <span class="mc__title">
            {this.glyph && <span class="mc__glyph">{this.glyph}</span>}
            <span class="mc__label">{this.label}</span>
          </span>
          <span class="mc__value">{this.value}</span>
          {this.sub && <span class="mc__sub">{this.sub}</span>}
          {this.loggable && (
            <span class="mc__hint" aria-hidden="true">
              Tap to log
            </span>
          )}
        </button>
      </Host>
    );
  }
}
