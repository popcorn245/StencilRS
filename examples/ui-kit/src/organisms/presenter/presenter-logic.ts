/**
 * Pure tier-resolution logic for pop-presenter. No Stencil imports — exported
 * from the package entry so hosts can derive tiers (and reuse the canonical
 * breakpoints) without touching the component.
 */

export type PresenterTier = 'sheet' | 'dialog' | 'dock';

/** Canonical presentation-tier breakpoints (the quick-controls spec values):
 *  sheet < 768, dialog 768–1199, dock ≥ 1200. Overridable per-instance via the
 *  presenter's `sheetMax` / `dockMin` props — deliberately, never accidentally. */
export const PRESENTER_BREAKPOINTS = {
  /** Sheet when viewport ≤ sheetMax (i.e. < 768). */
  sheetMax: 767,
  /** Dock when viewport ≥ dockMin. */
  dockMin: 1200,
} as const;

/** Pure tier resolution: forced `tier` wins; then width ≤ sheetMax → sheet;
 *  ≥ dockMin → dock; otherwise dialog. */
export function resolvePresenterTier(
  width: number,
  opts: { sheetMax?: number; dockMin?: number; tier?: PresenterTier } = {},
): PresenterTier {
  if (opts.tier) return opts.tier;
  const sheetMax = opts.sheetMax ?? PRESENTER_BREAKPOINTS.sheetMax;
  const dockMin = opts.dockMin ?? PRESENTER_BREAKPOINTS.dockMin;
  if (width <= sheetMax) return 'sheet';
  if (width >= dockMin) return 'dock';
  return 'dialog';
}
