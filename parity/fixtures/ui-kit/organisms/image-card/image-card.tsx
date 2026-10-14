import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * pop-image-card — a shared image-forward card: a media area on top (an <img>
 * fallback, or a `media` slot for a proxied/authed thumb) with content beneath
 * (title / tags / quantity via the default slot) and an optional `actions` row.
 *
 * Modeled on pop-quest-card (clickable content-under-media, a composed+bubbling
 * `cardSelect` event) and the hub-images card CSS. The aspect-ratio lives on the
 * media WRAPPER (a block box), never the replaced <img> — an `<img aspect-ratio>`
 * in a grid track collapses the row.
 *
 * Slots:
 *   • media   — replaces the fallback <img> (e.g. a token-authenticated thumb).
 *   • default — the card body (title, tags, qty stepper …).
 *   • actions — a footer action row (Send / Save …).
 */
@Component({
  tag: 'pop-image-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'image-card.css',
})
export class PopImageCard {
  /** Image URL for the fallback <img> (ignored when the `media` slot is filled). */
  @Prop() src = '';

  /** Alt text for the fallback <img>. */
  @Prop() alt = '';

  /** Optional title rendered above the default slot content. */
  @Prop() cardTitle?: string;

  /** CSS aspect-ratio for the media wrapper (e.g. '1/1', '4/3', '16/9'). */
  @Prop() aspect = '1/1';

  /** Whether the whole card is a button (emits `cardSelect` on click/Enter). */
  @Prop() clickable = false;

  /** Optional id echoed back in the `cardSelect` event detail. */
  @Prop() cardId = '';

  /** When set, the card renders as an <a href> instead of emitting. */
  @Prop() href?: string;

  /** Emitted when a `clickable` card is activated (click / Enter / Space). */
  @Event({ composed: true, bubbles: true }) cardSelect!: EventEmitter<string>;

  private onActivate = (ev: Event) => {
    if (this.href) return; // the anchor handles navigation itself
    ev.preventDefault();
    this.cardSelect.emit(this.cardId);
  };

  render() {
    const media = (
      <div class="pic-media" style={{ aspectRatio: this.aspect.replace('/', ' / ') }}>
        <slot name="media">
          {this.src && <img class="pic-img" src={this.src} alt={this.alt} loading="lazy" />}
        </slot>
      </div>
    );
    const body = [
      this.cardTitle && <div class="pic-title">{this.cardTitle}</div>,
      <div class="pic-content">
        <slot />
      </div>,
    ];
    const actions = (
      <div class="pic-actions">
        <slot name="actions" />
      </div>
    );

    const rootClass = { 'pic-root': true, 'pic-root--clickable': this.clickable };

    if (this.href) {
      return (
        <a class={rootClass} href={this.href}>
          {media}
          {body}
          {actions}
        </a>
      );
    }
    if (this.clickable) {
      return (
        <div
          class={rootClass}
          role="button"
          tabIndex={0}
          onClick={this.onActivate}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') this.onActivate(e);
          }}
        >
          {media}
          {body}
          {actions}
        </div>
      );
    }
    return (
      <div class={rootClass}>
        {media}
        {body}
        {actions}
      </div>
    );
  }
}
