import { Component, Host, Prop, h } from '@stencil/core';

/**
 * @name pop-icon
 * @description A perfectly-centered icon atom that wraps `ion-icon`. Unlike a
 * bare `ion-icon`, it renders as a centered inline-flex block with
 * `line-height: 0`, so the glyph never picks up inline/baseline offset.
 *
 * Sizing: the icon inherits `1em` from the host font-size, so callers can size
 * it with CSS `font-size` or the `--size` custom property. The optional `size`
 * prop sets `font-size` on the host directly.
 */
@Component({
  tag: 'pop-icon',
  encapsulation: { type: 'scoped' },
  styleUrl: 'icon.css',
})
export class Icon {
  /** The ionicon name (e.g. "close", "checkmark", "add"). */
  @Prop() name?: string;

  /** Pass-through SVG src URL (alternative to `name`). */
  @Prop() src?: string;

  /**
   * Optional explicit size; sets `font-size` on the host (e.g. "1.2rem",
   * "20px"). When omitted the icon inherits `1em` from the host font-size,
   * which can also be driven via the `--size` custom property.
   */
  @Prop() size?: string;

  /**
   * Accessible label. When present, the icon exposes `aria-label` + `role="img"`;
   * otherwise it is marked `aria-hidden="true"`.
   */
  @Prop() label?: string;

  render() {
    const hasLabel = !!this.label;

    // Centering + sizing are mirrored inline so the host is a perfectly-centered,
    // VISIBLE block even though this is a scoped component (`:host` css doesn't
    // apply in scoped mode). font-size falls back to `var(--size, 1.25rem)` — NOT
    // inherit — so an icon-only button that sets `font-size: 0` (to hide text)
    // can't collapse the glyph to 0. An explicit `size` prop wins.
    const style: { [key: string]: string } = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: '0',
      fontSize: this.size || 'var(--size, 1.25rem)',
    };

    return (
      <Host
        class="pop-icon"
        style={style}
        role={hasLabel ? 'img' : undefined}
        aria-label={hasLabel ? this.label : undefined}
        aria-hidden={hasLabel ? undefined : 'true'}
      >
        <ion-icon
          class="pop-icon__glyph"
          name={this.name}
          src={this.src}
          aria-hidden="true"
        />
      </Host>
    );
  }
}
