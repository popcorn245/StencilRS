import { Component, Prop, Event, EventEmitter, Host, h } from '@stencil/core';

/**
 * pop-tile — a presentational quick-tile FACE (atom).
 *
 * Renders what a tile looks like: an emoji or ionicon, a label, a chip or
 * square variant, an accent color, and pressed/edit states. It deliberately
 * knows NOTHING about what a tile *is* (Firestore docs, capabilities) or what
 * happens around it (drag/reorder, tap routing) — the host wraps it for DnD
 * and decides what `popTap` does.
 *
 *   <pop-tile emoji="🌤️" label="Weather">
 *     <span>72° · H 78° L 61°</span>          <!-- rich face (default slot) -->
 *     <span slot="badge">3</span>              <!-- corner badge -->
 *   </pop-tile>
 *
 * Notes:
 *  - The face is a real <button> (`role` comes for free): keyboard-activatable,
 *    `aria-pressed` reflects `pressed`.
 *  - It never calls preventDefault on touch events — touch-drag arbitration
 *    belongs to the host's drag layer (see the hub touch-DnD gotcha).
 *  - The edit-mode delete button uses pop-icon (ionicons, centered) — emits
 *    `popDelete` and is only reachable while `editing`.
 */
@Component({
  tag: 'pop-tile',
  encapsulation: { type: 'scoped' },
  styleUrl: 'tile.css',
})
export class PopTile {
  /** Emoji face (e.g. '🌤️') — mutually exclusive with `icon`. */
  @Prop() emoji?: string;
  /** Ionicon name, rendered via pop-icon (used when no `emoji`). */
  @Prop() icon?: string;
  /** The tile label. */
  @Prop() label!: string;
  /** Square card (default) or compact chip pill. */
  @Prop() variant: 'square' | 'chip' = 'square';
  /** Accent — any CSS color (drives the face background tint). */
  @Prop() color?: string;
  /** Active/pressed visual state (reflected as aria-pressed). */
  @Prop() pressed = false;
  /** Edit mode: wiggle affordance + delete button. */
  @Prop() editing = false;
  @Prop() disabled = false;
  /** Whether the edit-mode delete button shows at all (hosts suppress it for
   *  tiles that must never be removed, e.g. a Settings tile). */
  @Prop() deletable = true;
  /** Ionicon for the edit-mode delete button — hosts repurpose it for their own
   *  remove semantics (e.g. 'eye-off-outline' = hide, 'eye-outline' = restore,
   *  'trash-outline' = delete). */
  @Prop() deleteIcon = 'close';
  /** Accessible name/tooltip for the delete button. */
  @Prop() deleteLabel = 'Delete';
  /** Tooltip for the face button. Defaults to the label. */
  @Prop() tileTitle?: string;

  /** The face was activated (click / Enter / Space). Not emitted while disabled. */
  @Event() popTap!: EventEmitter<void>;
  /** The edit-mode delete button was activated (only reachable when `editing`). */
  @Event() popDelete!: EventEmitter<void>;

  private onDelete = (e: MouseEvent) => {
    e.stopPropagation();
    this.popDelete.emit();
  };

  render() {
    const chip = this.variant === 'chip';
    return (
      <Host
        class={{
          'pop-tile--chip': chip,
          'pop-tile--square': !chip,
          'pop-tile--editing': this.editing,
        }}
      >
        <button
          type="button"
          class={{
            tile: true,
            'tile--chip': chip,
            'tile--square': !chip,
            'tile--pressed': this.pressed,
            'tile--editing': this.editing,
          }}
          style={this.color ? { '--pop-tile-accent': this.color, background: this.color } : undefined}
          disabled={this.disabled}
          aria-pressed={this.pressed ? 'true' : 'false'}
          title={this.tileTitle ?? this.label}
          onClick={() => this.popTap.emit()}
        >
          {this.emoji ? (
            <span class="tile__emoji" role="img" aria-label={this.label}>
              {this.emoji}
            </span>
          ) : this.icon ? (
            <pop-icon class="tile__icon" name={this.icon} />
          ) : null}
          <span class="tile__label">{this.label}</span>
          {/* Rich face content (live temp, activity, count) — under the label on
              squares, inline on chips; the whole face when no emoji/icon is set. */}
          <span class="tile__face">
            <slot></slot>
          </span>
          <span class="tile__badge">
            <slot name="badge"></slot>
          </span>
        </button>
        {this.editing && this.deletable && (
          <button
            type="button"
            class="tile__delete"
            aria-label={this.deleteLabel}
            title={this.deleteLabel}
            onClick={this.onDelete}
          >
            <pop-icon name={this.deleteIcon} />
          </button>
        )}
      </Host>
    );
  }
}
