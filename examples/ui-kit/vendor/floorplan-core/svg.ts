/**
 * Floor-plan SVG delivery.
 *
 * The committed source of truth for each floor's artwork lives at
 * `packages/floorplan-core/assets/<floorId>.svg`. We ALSO inline the markup
 * here so consumers (tasks-app in the browser, bucket-bot in node) can fetch a
 * floor's SVG string straight from the package with zero filesystem or
 * asset-copy build step — `floorSvg(id)` just works everywhere.
 *
 * HOUSE LAYOUT (docs bucket-bot/house-layout): the REAL house is
 * GEOMETRY-DRIVEN — every seeded room carries `geometry`, and pop-floor-map
 * draws the room cards itself, no base artwork needed. The old placeholder
 * `main`/`upper` SVGs (Living Room/Kitchen/Backyard on a dead floor set) were
 * REMOVED so `floorSvg('main')` returns null: leaving them in double-rendered
 * the stale rooms UNDER the real geometry cards. If a floor ever gets real
 * authored artwork again, add it to FLOOR_SVGS keyed by Floor.id (keep the
 * `<g id="…">` ids in sync with each Room's `svgGroupId`).
 */

const FLOOR_SVGS: Record<string, string> = {};

/** The floor viewBox — room `geometry`, device pins, and any authored floor
 *  artwork all share these units. */
export const FLOOR_VIEWBOX = { width: 800, height: 600 } as const;

/**
 * Return the inline SVG markup for a floor id, or null when unknown.
 * Accepts either the Floor.id ("main") or the asset key ("main.svg").
 */
export function floorSvg(floorId: string): string | null {
  const key = (floorId || '').replace(/\.svg$/i, '');
  return FLOOR_SVGS[key] ?? null;
}

/** Floor ids that ship with built-in placeholder artwork. */
export function builtinFloorIds(): string[] {
  return Object.keys(FLOOR_SVGS);
}
