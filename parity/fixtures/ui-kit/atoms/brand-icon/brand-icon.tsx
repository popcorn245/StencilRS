import { Component, Host, Prop, h } from '@stencil/core';
import { ICON_PATHS, type BrandIconName } from './icons';

/**
 * @name pop-brand-icon
 * @description A **self-contained, themeable SVG icon** atom. Unlike `pop-icon`
 * (which wraps a third-party `ion-icon` web component loaded from a CDN), this
 * atom renders inline `<svg>` from a bundled path registry (`./icons.ts`) so it
 * works offline, ships zero network requests, and inherits `currentColor` — so
 * it themes automatically with the surrounding text colour (light/dark).
 *
 * It replaces the emoji-as-icon usage across the notes-app "digital brain":
 * ★🔗✎🗑ⓘ✦⌂◷⌗◍⧉⚙▸ … each maps to a named vector.
 *
 * Sizing mirrors `pop-icon`: the glyph tracks `1em`, so callers size it with the
 * `size` prop, the `--size` custom property, or an ambient `font-size`.
 * Accessibility mirrors `pop-icon`: a `label` exposes `role="img"` +
 * `aria-label`; without one the icon is `aria-hidden` (decorative).
 */
@Component({
  tag: 'pop-brand-icon',
  encapsulation: { type: 'scoped' },
  styleUrl: 'brand-icon.css',
})
export class BrandIcon {
  /** The registered icon name (e.g. "star", "link", "trash"). */
  @Prop() name!: BrandIconName | string;

  /**
   * Optional explicit size; sets `font-size` on the host (e.g. "1.2rem",
   * "20px"). When omitted the icon inherits `1em` from the host font-size,
   * which can also be driven via the `--size` custom property.
   */
  @Prop() size?: string;

  /**
   * Accessible label. When present, the icon exposes `aria-label` + `role="img"`;
   * otherwise it is marked `aria-hidden="true"` (decorative).
   */
  @Prop() label?: string;

  /** Stroke weight override for the outline vectors (default 2). */
  @Prop() strokeWidth?: number;

  render() {
    const hasLabel = !!this.label;
    const def = ICON_PATHS[this.name as BrandIconName];

    // Centering + sizing mirrored inline so the host is a perfectly-centered
    // VISIBLE block even though this is a scoped component (`:host` css doesn't
    // apply in scoped mode). font-size falls back to `var(--size, 1.25rem)`.
    const style: { [key: string]: string } = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: '0',
      fontSize: this.size || 'var(--size, 1.25rem)',
    };

    // Build the whole <svg> as a string and inject it — Stencil's typed JSX has
    // no `innerHTML` on <svg>, and it can't diff arbitrary registry markup into
    // vnodes anyway, so we render a wrapper <span> with `innerHTML`. Everything
    // paints in `currentColor`, so the icon themes with the surrounding text.
    const paint = def?.fill
      ? 'fill="currentColor" stroke="none"'
      : `fill="none" stroke="currentColor" stroke-width="${this.strokeWidth ?? 2}"`;
    // The svg is injected via innerHTML, so it does NOT receive Stencil's scoped
    // style attribute — the `.pop-brand-icon__svg` class rule won't match it.
    // Size it with an INLINE style (1em square, tracks the host font-size) so the
    // glyph is always visible regardless of scoping.
    const svg = `<svg class="pop-brand-icon__svg" style="display:block;width:1em;height:1em;color:inherit;flex:0 0 auto" viewBox="0 0 24 24" ${paint} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${def?.body ?? ''}</svg>`;

    return (
      <Host
        class="pop-brand-icon"
        style={style}
        role={hasLabel ? 'img' : undefined}
        aria-label={hasLabel ? this.label : undefined}
        aria-hidden={hasLabel ? undefined : 'true'}
      >
        <span class="pop-brand-icon__wrap" innerHTML={svg}></span>
      </Host>
    );
  }
}
