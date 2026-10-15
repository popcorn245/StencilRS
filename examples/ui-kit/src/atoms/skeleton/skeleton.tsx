import { Component, Prop, h, Host } from '@stencil/core';

/**
 * pop-skeleton — a single shimmer placeholder block (atom). Compose several to
 * build a content-shaped loading state (a skeleton that mirrors the real row's
 * silhouette reads far better than a spinner). Size it with the `w` / `h` props
 * (any CSS length; `w` defaults to 100%), round it with `radius`, or make it a
 * circle with `circle` (uses `h` for both dimensions — for avatars / status
 * dots).
 *
 * Always decorative: `aria-hidden`. Wrap a group in a `role="status"` region so
 * assistive tech announces the load once, not per block.
 */
@Component({
  tag: 'pop-skeleton',
  encapsulation: { type: 'scoped' },
  styleUrl: 'skeleton.css',
})
export class PopSkeleton {
  /** Width (any CSS length). Ignored when `circle`. Default 100%. */
  @Prop() w?: string;
  /** Height (any CSS length). Default 0.75rem. */
  @Prop() h?: string;
  /** Corner radius (any CSS length). Default var(--radius-sm). */
  @Prop() radius?: string;
  /** Render a circle sized `h × h` (avatars, status dots). */
  @Prop() circle = false;

  render() {
    const size = this.h || '0.75rem';
    const style: { [k: string]: string } = {
      height: size,
      width: this.circle ? size : this.w || '100%',
      borderRadius: this.circle ? '999px' : this.radius || 'var(--radius-sm, 6px)',
    };
    return <Host class="pop-skeleton" aria-hidden="true" style={style} />;
  }
}
