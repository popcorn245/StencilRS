/** Pure scale helpers for pop-line-chart (unit-testable, no DOM). */

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  data: (number | null)[];
  /** Which y-axis this series maps to. */
  axis?: 'left' | 'right';
  /** Line (default), a filled area-from-baseline (e.g. precipitation), or
   *  baseline-anchored BARS (e.g. calories/day). Bar series render from a 0
   *  baseline in horizontal mode. */
  kind?: 'line' | 'area' | 'bar';
}

/** Extend a [min,max] domain to also cover the given extra values (goal lines,
 *  shaded value ranges) so they never clip outside the plotted area. */
export function extendDomain(domain: [number, number], values: number[]): [number, number] {
  let [lo, hi] = domain;
  for (const v of values) {
    if (v == null || Number.isNaN(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/** Min/max of a set of series on one axis (ignoring null/NaN), with padding. */
export function axisDomain(series: ChartSeries[], axis: 'left' | 'right', pad = 0.1): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    if ((s.axis ?? 'left') !== axis) continue;
    for (const v of s.data) {
      if (v == null || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const span = max - min;
  return [min - span * pad, max + span * pad];
}

/** Map a value in [domainMin,domainMax] → a Y pixel in [yTop,yBottom] (inverted). */
export function scaleY(value: number, domain: [number, number], yTop: number, yBottom: number): number {
  const [d0, d1] = domain;
  if (d1 === d0) return (yTop + yBottom) / 2;
  const t = (value - d0) / (d1 - d0);
  return yBottom - t * (yBottom - yTop);
}

/** Map a data index → an X pixel evenly across [xLeft,xRight]. */
export function scaleX(index: number, count: number, xLeft: number, xRight: number): number {
  if (count <= 1) return (xLeft + xRight) / 2;
  return xLeft + (index / (count - 1)) * (xRight - xLeft);
}

/**
 * Map a data index → a position along an axis using a FIXED step (row height),
 * centered in each cell: cell i spans [start + i*step, start + (i+1)*step) and
 * the point sits at its center. Used by the VERTICAL orientation so each data
 * point lines up row-for-row with an external list of the same row height.
 */
export function scaleStep(index: number, step: number, start = 0): number {
  return start + (index + 0.5) * step;
}

/**
 * Map a value in [domainMin,domainMax] → a pixel across [lo,hi] (NOT inverted).
 * The vertical chart's value axis runs left→right, so larger values map further
 * right; use this instead of scaleY (which inverts for a top-origin y-axis).
 */
export function scaleVal(value: number, domain: [number, number], lo: number, hi: number): number {
  const [d0, d1] = domain;
  if (d1 === d0) return (lo + hi) / 2;
  const t = (value - d0) / (d1 - d0);
  return lo + t * (hi - lo);
}

/**
 * Vertical-orientation line path: index advances DOWN (y, by fixed step), value
 * spreads ACROSS (x). Skips null gaps by segment, mirroring linePath.
 */
export function vLinePath(
  data: (number | null)[],
  domain: [number, number],
  xLeft: number,
  xRight: number,
  yTop: number,
  step: number,
): string {
  const segs: string[] = [];
  let cur: string[] = [];
  const flush = () => { if (cur.length) { segs.push('M' + cur.join(' L')); cur = []; } };
  data.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) { flush(); return; }
    const x = scaleVal(v, domain, xLeft, xRight);
    const y = scaleStep(i, step, yTop);
    cur.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  flush();
  return segs.join(' ');
}

/**
 * Vertical-orientation area path: filled from the LEFT edge (xLeft baseline) to
 * each point's x, advancing down by step. Mirrors areaPath for the rotated axes.
 */
export function vAreaPath(
  data: (number | null)[],
  domain: [number, number],
  xLeft: number,
  xRight: number,
  yTop: number,
  step: number,
): string {
  const pts: { x: number; y: number }[] = [];
  data.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) return;
    pts.push({ x: scaleVal(v, domain, xLeft, xRight), y: scaleStep(i, step, yTop) });
  });
  if (!pts.length) return '';
  const body = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
  const firstY = pts[0].y.toFixed(1);
  const lastY = pts[pts.length - 1].y.toFixed(1);
  // Close along the left baseline (xLeft) back up to the first point.
  return `M${xLeft.toFixed(1)},${firstY} L${body} L${xLeft.toFixed(1)},${lastY} Z`;
}

/** Build an SVG polyline `points` string for a series (skips null gaps by segment). */
export function linePath(
  data: (number | null)[],
  domain: [number, number],
  xLeft: number,
  xRight: number,
  yTop: number,
  yBottom: number,
): string {
  const segs: string[] = [];
  let cur: string[] = [];
  const flush = () => { if (cur.length) { segs.push('M' + cur.join(' L')); cur = []; } };
  data.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) { flush(); return; }
    const x = scaleX(i, data.length, xLeft, xRight);
    const y = scaleY(v, domain, yTop, yBottom);
    cur.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  flush();
  return segs.join(' ');
}

/** Build a filled area path (baseline at yBottom) for an area series. */
export function areaPath(
  data: (number | null)[],
  domain: [number, number],
  xLeft: number,
  xRight: number,
  yTop: number,
  yBottom: number,
): string {
  const pts: string[] = [];
  data.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) return;
    const x = scaleX(i, data.length, xLeft, xRight);
    const y = scaleY(v, domain, yTop, yBottom);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (!pts.length) return '';
  const firstX = pts[0].split(',')[0];
  const lastX = pts[pts.length - 1].split(',')[0];
  return `M${firstX},${yBottom.toFixed(1)} L${pts.join(' L')} L${lastX},${yBottom.toFixed(1)} Z`;
}
