import { describe, expect, it } from 'vitest';
import {
  banlistCap,
  deckPartSize,
  isExtraDeckFrame,
  validateDeck,
  type DeckCardInfo,
  type DeckEntry,
} from './deck.js';

// A tiny card_db-shaped lookup (docs planned/yugioh-playtest/deck-model-and-storage
// §validation-rules — every violation code in the table gets a case below).
const CARDS: Record<string, DeckCardInfo> = {
  '89631139': { name: 'Blue-Eyes White Dragon', type: 'Normal Monster', frameType: 'normal', banTcg: null },
  '46986414': { name: 'Dark Magician', type: 'Normal Monster', frameType: 'normal', banTcg: null },
  '14558127': { name: 'Ash Blossom & Joyous Spring', type: 'Effect Monster', frameType: 'effect', banTcg: null },
  '24224830': { name: 'Called by the Grave', type: 'Spell Card', frameType: 'spell', banTcg: 'Limited' },
  '23434538': { name: 'Maxx "C"', type: 'Effect Monster', frameType: 'effect', banTcg: 'Banned' },
  '18144506': { name: 'Harpie\'s Feather Duster', type: 'Spell Card', frameType: 'spell', banTcg: 'Semi-Limited' },
  '86066372': { name: 'Blue-Eyes Ultimate Dragon', type: 'Fusion Monster', frameType: 'fusion', banTcg: null },
  '2857636':  { name: 'Odd-Eyes Vortex Dragon', type: 'Fusion Pendulum Monster', frameType: 'fusion_pendulum', banTcg: null },
  '73915051': { name: 'Skull Servant Token', type: 'Token', frameType: 'token', banTcg: null },
};
const lookup = (p: string) => CARDS[p] ?? null;

/** n distinct filler passcodes at `count` copies each (all resolvable). */
function filler(totalCopies: number): DeckEntry[] {
  // Reuse three real filler cards at up to 3 copies, then synthesize unknowns —
  // tests that need a CLEAN 40 use fillerKnown below instead.
  const out: DeckEntry[] = [];
  let remaining = totalCopies;
  let i = 0;
  const known = ['89631139', '46986414', '14558127'];
  while (remaining > 0) {
    const passcode = i < known.length ? known[i] : String(90000000 + i);
    const count = Math.min(3, remaining);
    out.push({ passcode, count });
    remaining -= count;
    i++;
  }
  return out;
}

/** A lookup that ALSO resolves the synthesized 90xxxxxx fillers as vanillas. */
const lookupAll = (p: string): DeckCardInfo | null =>
  CARDS[p] ?? (p.startsWith('9') ? { name: `Filler ${p}`, type: 'Normal Monster', frameType: 'normal', banTcg: null } : null);

describe('deckPartSize / banlistCap / isExtraDeckFrame', () => {
  it('sums counts', () => {
    expect(deckPartSize([{ passcode: 'a', count: 3 }, { passcode: 'b', count: 2 }])).toBe(5);
    expect(deckPartSize([])).toBe(0);
  });

  it('maps banlist statuses to caps', () => {
    expect(banlistCap('Banned')).toBe(0);
    // The LIVE cardinfo.php dump uses "Forbidden" (verified against prod card_db).
    expect(banlistCap('Forbidden')).toBe(0);
    expect(banlistCap('Limited')).toBe(1);
    expect(banlistCap('Semi-Limited')).toBe(2);
    expect(banlistCap(null)).toBe(3);
    expect(banlistCap(undefined)).toBe(3);
  });

  it('extra-deck frames include the pendulum variants', () => {
    for (const f of ['fusion', 'synchro', 'xyz', 'link', 'fusion_pendulum', 'synchro_pendulum', 'xyz_pendulum']) {
      expect(isExtraDeckFrame(f)).toBe(true);
    }
    for (const f of ['normal', 'effect', 'spell', 'trap', 'normal_pendulum', 'effect_pendulum', null]) {
      expect(isExtraDeckFrame(f)).toBe(false);
    }
  });
});

describe('validateDeck — sizes', () => {
  it('a legal 40/1/0 deck has no errors', () => {
    const v = validateDeck({ main: filler(40), extra: [{ passcode: '86066372', count: 1 }], side: [] }, lookupAll);
    expect(v.violations.filter((x) => x.severity === 'error')).toEqual([]);
    expect(v.legal).toBe(true);
    expect(v.counts).toEqual({ main: 40, extra: 1, side: 0 });
  });

  it('39 main → main_too_small', () => {
    const v = validateDeck({ main: filler(39), extra: [], side: [] }, lookupAll);
    expect(v.violations.map((x) => x.code)).toContain('main_too_small');
    expect(v.legal).toBe(false);
  });

  it('61 main → main_too_large; 60 is fine', () => {
    expect(validateDeck({ main: filler(61), extra: [], side: [] }, lookupAll).violations.map((x) => x.code)).toContain('main_too_large');
    expect(validateDeck({ main: filler(60), extra: [], side: [] }, lookupAll).legal).toBe(true);
  });

  it('16 extra → extra_too_large; 16 side → side_too_large', () => {
    const extra16 = Array.from({ length: 16 }, () => ({ passcode: '86066372', count: 1 }));
    const vE = validateDeck({ main: filler(40), extra: extra16, side: [] }, lookupAll);
    expect(vE.violations.map((x) => x.code)).toContain('extra_too_large');
    const side16 = [{ passcode: '14558127', count: 3 }, ...filler(13).map((e) => ({ ...e, passcode: String(91000000 + Number(e.passcode) % 1000) }))];
    const vS = validateDeck({ main: filler(40), extra: [], side: side16 }, lookupAll);
    expect(deckPartSize(side16)).toBe(16);
    expect(vS.violations.map((x) => x.code)).toContain('side_too_large');
  });
});

describe('validateDeck — copy cap & banlist', () => {
  it('4 copies ACROSS main+side → too_many_copies (cap spans all parts)', () => {
    const deck = {
      main: [{ passcode: '89631139', count: 3 }, ...filler(37).filter((e) => e.passcode !== '89631139')],
      extra: [],
      side: [{ passcode: '89631139', count: 1 }],
    };
    const v = validateDeck(deck, lookupAll);
    const codes = v.violations.filter((x) => x.code === 'too_many_copies');
    expect(codes.length).toBe(1);
    expect(codes[0].passcode).toBe('89631139');
  });

  it('Banned card → banlist_violation at 1 copy', () => {
    const v = validateDeck({ main: [...filler(39).filter((e) => e.passcode !== '23434538'), { passcode: '23434538', count: 1 }], extra: [], side: [] }, lookupAll);
    const b = v.violations.find((x) => x.code === 'banlist_violation');
    expect(b).toBeTruthy();
    expect(b!.banStatus).toBe('Banned');
    expect(b!.cardName).toBe('Maxx "C"');
  });

  it('Limited card fine at 1, violation at 2; Semi-Limited fine at 2, violation at 3', () => {
    const base = filler(37);
    expect(validateDeck({ main: [...base, { passcode: '24224830', count: 1 }, { passcode: '18144506', count: 2 }], extra: [], side: [] }, lookupAll).legal).toBe(true);
    const v2 = validateDeck({ main: [...base.slice(0, 36), { passcode: '24224830', count: 2 }, { passcode: '18144506', count: 3 }], extra: [], side: [] }, lookupAll);
    const banned = v2.violations.filter((x) => x.code === 'banlist_violation').map((x) => x.passcode).sort();
    expect(banned).toEqual(['18144506', '24224830']);
  });
});

describe('validateDeck — placement & card sanity', () => {
  it('fusion in main → wrong_deck_part; fusion_pendulum in main too', () => {
    const v = validateDeck({ main: [...filler(38), { passcode: '86066372', count: 1 }, { passcode: '2857636', count: 1 }], extra: [], side: [] }, lookupAll);
    const wrong = v.violations.filter((x) => x.code === 'wrong_deck_part');
    expect(wrong.map((x) => x.passcode).sort()).toEqual(['2857636', '86066372']);
  });

  it('non-extra frame in extra → wrong_deck_part', () => {
    const v = validateDeck({ main: filler(40), extra: [{ passcode: '14558127', count: 1 }], side: [] }, lookupAll);
    expect(v.violations.some((x) => x.code === 'wrong_deck_part' && x.part === 'extra')).toBe(true);
  });

  it('extra frame in side → wrong_deck_part (spec: extra frames ONLY in extra)', () => {
    const v = validateDeck({ main: filler(40), extra: [], side: [{ passcode: '86066372', count: 1 }] }, lookupAll);
    expect(v.violations.some((x) => x.code === 'wrong_deck_part' && x.part === 'side')).toBe(true);
  });

  it('unknown passcode → unknown_card WARNING (deck still legal)', () => {
    const v = validateDeck({ main: [...filler(39), { passcode: '12345678', count: 1 }], extra: [], side: [] }, lookupAll);
    const u = v.violations.find((x) => x.code === 'unknown_card');
    expect(u).toBeTruthy();
    expect(u!.severity).toBe('warning');
    expect(v.legal).toBe(true); // warnings never block
  });

  it('Token → illegal_card_type', () => {
    const v = validateDeck({ main: [...filler(39), { passcode: '73915051', count: 1 }], extra: [], side: [] }, lookupAll);
    expect(v.violations.some((x) => x.code === 'illegal_card_type')).toBe(true);
    expect(v.legal).toBe(false);
  });
});
