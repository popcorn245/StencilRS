import { describe, it, expect } from 'vitest';
import {
  axisDomain, scaleX, scaleY, scaleStep, scaleVal, linePath, areaPath,
  vLinePath, vAreaPath, type ChartSeries,
} from './chart-scale';

const tempSeries: ChartSeries = { key: 't', label: 'Temp', color: '#f00', data: [70, 80, 75], axis: 'left' };
const humSeries: ChartSeries = { key: 'h', label: 'Hum', color: '#00f', data: [40, 60, 50], axis: 'right' };

describe('axisDomain', () => {
  it('computes a padded min/max for the requested axis only', () => {
    const [lo, hi] = axisDomain([tempSeries, humSeries], 'left', 0);
    expect(lo).toBe(70);
    expect(hi).toBe(80);
  });
  it('pads the domain by the given fraction', () => {
    const [lo, hi] = axisDomain([tempSeries], 'left', 0.1);
    // span 10, pad 1 each side
    expect(lo).toBeCloseTo(69);
    expect(hi).toBeCloseTo(81);
  });
  it('ignores nulls/NaN', () => {
    const s: ChartSeries = { key: 'x', label: '', color: '', data: [null, 5, NaN, 9], axis: 'left' };
    expect(axisDomain([s], 'left', 0)).toEqual([5, 9]);
  });
  it('handles a flat series (min===max) without zero span', () => {
    const s: ChartSeries = { key: 'x', label: '', color: '', data: [50, 50], axis: 'left' };
    expect(axisDomain([s], 'left')).toEqual([49, 51]);
  });
  it('falls back to [0,1] when no data on the axis', () => {
    expect(axisDomain([humSeries], 'left')).toEqual([0, 1]);
  });
});

describe('scaleY / scaleX', () => {
  it('scaleY inverts: domain max → top, min → bottom', () => {
    expect(scaleY(80, [70, 80], 0, 100)).toBe(0);
    expect(scaleY(70, [70, 80], 0, 100)).toBe(100);
    expect(scaleY(75, [70, 80], 0, 100)).toBe(50);
  });
  it('scaleX spreads indices evenly', () => {
    expect(scaleX(0, 3, 0, 100)).toBe(0);
    expect(scaleX(1, 3, 0, 100)).toBe(50);
    expect(scaleX(2, 3, 0, 100)).toBe(100);
  });
  it('scaleX centers a single point', () => {
    expect(scaleX(0, 1, 0, 100)).toBe(50);
  });
});

describe('linePath / areaPath', () => {
  it('linePath builds an M…L polyline', () => {
    const p = linePath([70, 80], [70, 80], 0, 100, 0, 100);
    expect(p).toBe('M0.0,100.0 L100.0,0.0');
  });
  it('linePath splits into separate segments across a null gap', () => {
    const p = linePath([70, null, 80], [70, 80], 0, 100, 0, 100);
    expect((p.match(/M/g) || []).length).toBe(2);
  });
  it('areaPath closes the path to the baseline', () => {
    const p = areaPath([70, 80], [70, 80], 0, 100, 0, 100);
    expect(p.startsWith('M0.0,100.0')).toBe(true);
    expect(p.endsWith('Z')).toBe(true);
  });
  it('areaPath is empty for all-null data', () => {
    expect(areaPath([null, null], [0, 1], 0, 100, 0, 100)).toBe('');
  });
});

describe('vertical orientation scales', () => {
  it('scaleStep centers each cell at (i+0.5)*step from start', () => {
    expect(scaleStep(0, 44, 0)).toBe(22);
    expect(scaleStep(1, 44, 0)).toBe(66);
    expect(scaleStep(2, 44, 10)).toBe(10 + 2.5 * 44);
  });
  it('scaleVal maps value across [lo,hi] NON-inverted (max → hi)', () => {
    expect(scaleVal(80, [70, 80], 0, 100)).toBe(100);
    expect(scaleVal(70, [70, 80], 0, 100)).toBe(0);
    expect(scaleVal(75, [70, 80], 0, 100)).toBe(50);
  });
  it('scaleVal centers a flat domain', () => {
    expect(scaleVal(5, [5, 5], 0, 100)).toBe(50);
  });
  it('vLinePath advances y by step per row and x by value', () => {
    // data [70,80], domain [70,80], x in [0,100], step 44 from yTop 0.
    // row0 center y=22 → val70 → x0; row1 center y=66 → val80 → x100.
    expect(vLinePath([70, 80], [70, 80], 0, 100, 0, 44)).toBe('M0.0,22.0 L100.0,66.0');
  });
  it('vLinePath splits into separate segments across a null gap', () => {
    const p = vLinePath([70, null, 80], [70, 80], 0, 100, 0, 44);
    expect((p.match(/M/g) || []).length).toBe(2);
  });
  it('vAreaPath closes back along the LEFT baseline (xLeft)', () => {
    const p = vAreaPath([70, 80], [70, 80], 0, 100, 0, 44);
    expect(p.startsWith('M0.0,22.0')).toBe(true); // baseline x=0 at first row y
    expect(p.endsWith('Z')).toBe(true);
    expect(p).toContain('L0.0,66.0'); // closes down the left edge to last row y
  });
  it('vAreaPath is empty for all-null data', () => {
    expect(vAreaPath([null, null], [0, 1], 0, 100, 0, 44)).toBe('');
  });
});
