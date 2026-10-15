import { describe, expect, it } from 'vitest';
import { decodeYdke, encodeYdke } from './ydke.js';

/** Independent reference encoding: Buffer + DataView little-endian — proves
 *  the hand-rolled base64/LE packing against Node's own implementations
 *  (the wire format the `ydke` npm package defines; P6 reimplementation). */
function referenceSegment(passcodes: string[]): string {
  const buf = Buffer.alloc(passcodes.length * 4);
  passcodes.forEach((p, i) => buf.writeUInt32LE(Number(p), i * 4));
  return buf.toString('base64');
}

describe('encodeYdke', () => {
  it('hand-verified vector: main=[1] → AQAAAA== (bytes 01 00 00 00)', () => {
    expect(encodeYdke({ main: ['1'], extra: [], side: [] })).toBe('ydke://AQAAAA==!!!');
  });

  it('matches the independent Buffer/LE reference for real passcodes', () => {
    const main = ['89631139', '89631139', '89631139', '46986414'];
    const extra = ['86066372'];
    const side = ['14558127', '24224830'];
    expect(encodeYdke({ main, extra, side })).toBe(
      `ydke://${referenceSegment(main)}!${referenceSegment(extra)}!${referenceSegment(side)}!`,
    );
  });

  it('empty deck → ydke://!!!', () => {
    expect(encodeYdke({ main: [], extra: [], side: [] })).toBe('ydke://!!!');
  });
});

describe('decodeYdke', () => {
  it('decodes a reference-encoded URL back to the exact passcode lists (per copy, in order)', () => {
    const main = ['89631139', '89631139', '32807846'];
    const extra = ['86066372'];
    const side: string[] = [];
    const url = `ydke://${referenceSegment(main)}!${referenceSegment(extra)}!${referenceSegment(side)}!`;
    expect(decodeYdke(url)).toEqual({ main, extra, side });
  });

  it('round-trips byte-identically: encode(decode(url)) === url', () => {
    const url = encodeYdke({
      main: ['89631139', '89631139', '89631139', '46986414', '14558127'],
      extra: ['86066372', '2857636'],
      side: ['24224830'],
    });
    expect(encodeYdke(decodeYdke(url))).toBe(url);
  });

  it('tolerates a missing trailing !', () => {
    const withBang = encodeYdke({ main: ['89631139'], extra: [], side: ['14558127'] });
    const without = withBang.replace(/!$/, '');
    expect(decodeYdke(without)).toEqual(decodeYdke(withBang));
  });

  it('preserves passcodes with leading-zero 8-digit forms as their numeric string', () => {
    // 04031928 is stored numerically (4031928) — the codec is numeric by design.
    const url = encodeYdke({ main: ['4031928'], extra: [], side: [] });
    expect(decodeYdke(url).main).toEqual(['4031928']);
  });

  it('throws on a non-ydke URL and on malformed segments', () => {
    expect(() => decodeYdke('https://example.com')).toThrow();
    expect(() => decodeYdke('ydke://AQAA!!!')).toThrow(); // 3 bytes ≠ whole uint32s
    expect(() => decodeYdke('ydke://???!!!')).toThrow(); // not base64
    expect(() => decodeYdke('ydke://AQAAAA==')).toThrow(); // missing extra/side segments
  });
});
