import { describe, it, expect } from 'vitest';
import {
  clampNumber,
  depthStopFromValues,
  depthValuesForStop,
  clampCustomSources,
  normalizeDepthValue,
  persistToggles,
  persistFromToggles,
  isTruthyValue,
} from './field-logic';

describe('clampNumber', () => {
  it('clamps to bounds', () => {
    expect(clampNumber('15', 1, 10)).toBe(10);
    expect(clampNumber('-3', 1, 10)).toBe(1);
    expect(clampNumber('5', 1, 10)).toBe(5);
  });
  it('returns null for non-numbers and empty', () => {
    expect(clampNumber('', 1, 10)).toBeNull();
    expect(clampNumber('abc')).toBeNull();
    expect(clampNumber('1.')).toBe(1); // parseable
  });
  it('works with one-sided bounds', () => {
    expect(clampNumber('99', undefined, 10)).toBe(10);
    expect(clampNumber('0', 1, undefined)).toBe(1);
  });
});

describe('depth composite', () => {
  it('derives the stop from values', () => {
    expect(depthStopFromValues(undefined, undefined)).toBe('standard');
    expect(depthStopFromValues('quick', '')).toBe('quick');
    expect(depthStopFromValues('deep', undefined)).toBe('deep');
    expect(depthStopFromValues('', '7')).toBe('custom');
    expect(depthStopFromValues('bogus', '')).toBe('standard');
  });
  it('produces the right patch per stop', () => {
    expect(depthValuesForStop('quick', 8)).toEqual({ depth: 'quick', maxSources: '' });
    expect(depthValuesForStop('custom', 7)).toEqual({ depth: '', maxSources: '7' });
  });
  it('clamps custom sources to 1..10', () => {
    expect(clampCustomSources(0)).toBe(1);
    expect(clampCustomSources(22)).toBe(10);
    expect(clampCustomSources(NaN)).toBe(8);
  });
  it('normalizes object / string / unset values', () => {
    expect(normalizeDepthValue({ depth: 'deep', maxSources: '' })).toEqual({ depth: 'deep', maxSources: '' });
    expect(normalizeDepthValue('quick')).toEqual({ depth: 'quick', maxSources: '' });
    expect(normalizeDepthValue(undefined)).toEqual({ depth: '', maxSources: '' });
  });
});

describe('persist composite', () => {
  it('splits a persist value into toggles', () => {
    expect(persistToggles('both')).toEqual({ note: true, index: true });
    expect(persistToggles('note')).toEqual({ note: true, index: false });
    expect(persistToggles(undefined)).toEqual({ note: false, index: false });
  });
  it('combines toggles into a persist value', () => {
    expect(persistFromToggles(true, true)).toBe('both');
    expect(persistFromToggles(true, false)).toBe('note');
    expect(persistFromToggles(false, true)).toBe('index');
    expect(persistFromToggles(false, false)).toBe('none');
  });
});

describe('isTruthyValue', () => {
  it('parses loose booleans', () => {
    expect(isTruthyValue('true')).toBe(true);
    expect(isTruthyValue('YES')).toBe(true);
    expect(isTruthyValue(true)).toBe(true);
    expect(isTruthyValue('false')).toBe(false);
    expect(isTruthyValue('')).toBe(false);
    expect(isTruthyValue(undefined)).toBe(false);
  });
});
