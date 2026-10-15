import { describe, expect, it } from 'vitest';
import { parseYdk, serializeYdk } from './ydk.js';

const SAMPLE = `#created by yugioh.popcorn245.com
#main
89631139
89631139
89631139
32807846
#extra
86066372
!side
14558127
`;

describe('parseYdk', () => {
  it('parses sections and aggregates copies into entries', () => {
    const d = parseYdk(SAMPLE);
    expect(d.main).toEqual([
      { passcode: '89631139', count: 3 },
      { passcode: '32807846', count: 1 },
    ]);
    expect(d.extra).toEqual([{ passcode: '86066372', count: 1 }]);
    expect(d.side).toEqual([{ passcode: '14558127', count: 1 }]);
    expect(d.warnings).toEqual([]);
  });

  it('tolerates CRLF, blank lines and #comments anywhere', () => {
    const crlf = SAMPLE.replace(/\n/g, '\r\n') + '\r\n#some trailing comment\r\n';
    const d = parseYdk(crlf);
    expect(d.main.length).toBe(2);
    expect(d.warnings).toEqual([]);
  });

  it('ignores lines before #main (the #created by convention + junk headers)', () => {
    const d = parseYdk('made with SomeTool\n#created by EDOPro\n#main\n89631139\n#extra\n!side\n');
    expect(d.main).toEqual([{ passcode: '89631139', count: 1 }]);
    expect(d.warnings).toEqual([]); // pre-#main junk is silently ignored
  });

  it('collects unparseable in-section lines into warnings (import still succeeds)', () => {
    const d = parseYdk('#main\n89631139\nnot-a-passcode\n123456789012345\n#extra\n!side\n');
    expect(d.main).toEqual([{ passcode: '89631139', count: 1 }]);
    expect(d.warnings.length).toBe(2);
    expect(d.warnings[0]).toContain('not-a-passcode');
  });

  it('handles a deck with no side marker (side empty)', () => {
    const d = parseYdk('#main\n89631139\n#extra\n86066372\n');
    expect(d.side).toEqual([]);
    expect(d.extra).toEqual([{ passcode: '86066372', count: 1 }]);
  });
});

describe('serializeYdk', () => {
  it('emits canonical section order with the #created by header, one passcode per copy', () => {
    const text = serializeYdk({
      main: [{ passcode: '89631139', count: 3 }, { passcode: '32807846', count: 1 }],
      extra: [{ passcode: '86066372', count: 1 }],
      side: [{ passcode: '14558127', count: 1 }],
    });
    expect(text).toBe(SAMPLE);
  });

  it('round-trips: parse(serialize(deck)) deep-equals deck', () => {
    const deck = {
      main: [
        { passcode: '89631139', count: 3 },
        { passcode: '46986414', count: 2 },
        { passcode: '14558127', count: 1 },
      ],
      extra: [{ passcode: '86066372', count: 2 }],
      side: [{ passcode: '24224830', count: 1 }, { passcode: '18144506', count: 2 }],
    };
    const back = parseYdk(serializeYdk(deck));
    expect({ main: back.main, extra: back.extra, side: back.side }).toEqual(deck);
    expect(back.warnings).toEqual([]);
  });

  it('round-trips empty parts', () => {
    const deck = { main: [{ passcode: '89631139', count: 1 }], extra: [], side: [] };
    const back = parseYdk(serializeYdk(deck));
    expect({ main: back.main, extra: back.extra, side: back.side }).toEqual(deck);
  });
});
