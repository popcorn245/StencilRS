/**
 * pricing — pure printing-match + money-parse + price-fallback helpers
 * (migrated from bucket-bot card-pricing.test.ts; the HTTP provider tests stay
 * with the bot). No network.
 */
import { describe, expect, it } from 'vitest';
import {
  cardLevelPrice,
  editDistance,
  firstCard,
  fuzzyMatchPrinting,
  makePrintingId,
  matchPrinting,
  normalizeRarity,
  normalizeSetCode,
  ocrKey,
  parseMoney,
  pickLikelyPrinting,
  pricedSpread,
  resolvePriceFromCard,
  type YgoCard,
} from './pricing.js';

const blueEyes: YgoCard = {
  id: 89631139,
  name: 'Blue-Eyes White Dragon',
  type: 'Normal Monster',
  card_sets: [
    { set_name: 'Legend of Blue Eyes White Dragon', set_code: 'LOB-EN001', set_rarity: 'Ultra Rare', set_price: '12.40' },
    { set_name: 'Starter Deck: Kaiba', set_code: 'SDK-001', set_rarity: 'Ultra Rare', set_price: '5.00' },
    { set_name: 'Dark Beginning 1', set_code: 'DB1-EN001', set_rarity: 'Common', set_price: '1.50' },
  ],
  card_prices: [{ tcgplayer_price: '3.25', ebay_price: '4.00' }],
  card_images: [{ image_url: 'https://images.example/89631139.jpg' }],
};

describe('pure helpers', () => {
  it('normalizes + composes ids', () => {
    expect(normalizeSetCode(' lob-en001 ')).toBe('LOB-EN001');
    expect(makePrintingId(89631139, 'lob-en001')).toBe('89631139:LOB-EN001');
  });
  it('parses money, rejecting zero/garbage (the ONE parseMoney/parseSetPrice)', () => {
    expect(parseMoney('12.40')).toBe(12.4);
    expect(parseMoney('0.00')).toBeNull();
    expect(parseMoney('n/a')).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney('$8.15')).toBe(8.15);
  });
  it('matches a printing by set code (case-insensitive), else undefined', () => {
    expect(matchPrinting(blueEyes, 'lob-en001')?.set_code).toBe('LOB-EN001');
    expect(matchPrinting(blueEyes, 'ZZZ-EN999')).toBeUndefined();
  });
  it('picks a most-likely printing near the median price when set code is missing', () => {
    // prices 1.50 / 5.00 / 12.40 → median 5.00 → SDK-001.
    expect(pickLikelyPrinting(blueEyes)?.set_code).toBe('SDK-001');
  });
  it('falls back to card-level tcgplayer price', () => {
    expect(cardLevelPrice(blueEyes)).toBe(3.25);
  });
});

describe('resolvePriceFromCard', () => {
  it('prices a matched set code from its set_price (not auto-picked)', () => {
    const r = resolvePriceFromCard(blueEyes, 'LOB-EN001');
    expect(r.printing?.set_code).toBe('LOB-EN001');
    expect(r.value).toBe(12.4);
    expect(r.autoPicked).toBe(false);
  });
  it('auto-picks + flags when the set code is unmatched (multi-printing)', () => {
    const r = resolvePriceFromCard(blueEyes, 'NOPE-EN001');
    expect(r.autoPicked).toBe(true);
    expect(r.value).toBeGreaterThan(0);
  });
  it('a single-printing card with no set code is unambiguous (not auto-picked)', () => {
    const single: YgoCard = { id: 1, name: 'X', card_sets: [{ set_code: 'AAA-EN001', set_price: '2.00' }], card_prices: [] };
    const r = resolvePriceFromCard(single, '');
    expect(r.autoPicked).toBe(false);
    expect(r.value).toBe(2);
  });
  it('uses the tcgplayer fallback when no printing carries a price', () => {
    const noSetPrice: YgoCard = { id: 2, name: 'Y', card_sets: [{ set_code: 'Q-1' }, { set_code: 'Q-2' }], card_prices: [{ tcgplayer_price: '9.99' }] };
    const r = resolvePriceFromCard(noSetPrice, 'MISS');
    expect(r.value).toBe(9.99);
  });
});

describe('OCR-fuzzy set-code match', () => {
  it('ocrKey collapses the confusable pairs and strips separators', () => {
    // O→0, I/L→1, S→5, B→8, dashes dropped — read and truth land on one key.
    expect(ocrKey('LOB-EN0O1')).toBe(ocrKey('LOB-EN001'));
    expect(ocrKey('SDK-001')).toBe('5DK001');
    expect(ocrKey('')).toBe('');
  });
  it('editDistance is a plain Levenshtein', () => {
    expect(editDistance('ABC', 'ABC')).toBe(0);
    expect(editDistance('ABC', 'ABD')).toBe(1);
    expect(editDistance('ABC', 'AXYC')).toBe(2);
  });
  it('exact-under-OCR (one-char confusion) → the single confident printing', () => {
    // "LOB-EN0O1" (letter O for the middle zero) still pins LOB-EN001, and only it.
    expect(fuzzyMatchPrinting(blueEyes, 'LOB-EN0O1')?.set_code).toBe('LOB-EN001');
  });
  it('no fuzzy match when nothing is close', () => {
    expect(fuzzyMatchPrinting(blueEyes, 'ZZZ-EN999')).toBeUndefined();
  });
  it('returns undefined when TWO printings are ambiguously close (not confident)', () => {
    const twin: YgoCard = {
      id: 3,
      name: 'Twin',
      card_sets: [
        { set_code: 'RD-EN001', set_price: '1.00' },
        { set_code: 'RD-EN007', set_price: '2.00' },
      ],
    };
    // "RD-EN00I" (I→1) is distance 0 from …001 and distance 1 from …007 → ambiguous.
    expect(fuzzyMatchPrinting(twin, 'RD-EN00I')).toBeUndefined();
  });
  it('resolvePriceFromCard reports a fuzzy match as confident (NOT auto-picked)', () => {
    const r = resolvePriceFromCard(blueEyes, 'LOB-EN0O1');
    expect(r.matchQuality).toBe('fuzzy');
    expect(r.autoPicked).toBe(false);
    expect(r.printing?.set_code).toBe('LOB-EN001');
    expect(r.value).toBe(12.4);
  });
});

describe('rarity-narrowed pick', () => {
  it('normalizeRarity aligns "Ultra" / "Ultra Rare", keeps bare Rare/Common', () => {
    expect(normalizeRarity('Ultra')).toBe(normalizeRarity('Ultra Rare'));
    expect(normalizeRarity('Secret Rare')).toBe('SECRET');
    expect(normalizeRarity('Rare')).toBe('RARE');
    expect(normalizeRarity('Common')).toBe('COMMON');
    expect(normalizeRarity('')).toBe('');
  });
  it('narrows an unmatched multi-print to the ONE printing of that rarity', () => {
    // Blue-Eyes has one Common printing (DB1-EN001) — a Common read pins it.
    const r = resolvePriceFromCard(blueEyes, 'MISS-CODE', { rarity: 'Common' });
    expect(r.matchQuality).toBe('rarity');
    expect(r.autoPicked).toBe(false);
    expect(r.printing?.set_code).toBe('DB1-EN001');
    expect(r.value).toBe(1.5);
  });
  it('still auto-picks (within the rarity subset) when the rarity is ambiguous', () => {
    // Two Ultra Rare printings → rarity does not disambiguate → blind auto.
    const r = resolvePriceFromCard(blueEyes, 'MISS-CODE', { rarity: 'Ultra Rare' });
    expect(r.autoPicked).toBe(true);
    expect(r.matchQuality).toBe('auto');
  });
});

describe('resolvePriceFromCard match quality + spread', () => {
  it('reports the price spread over priced printings', () => {
    expect(pricedSpread(blueEyes)).toEqual({ min: 1.5, max: 12.4, count: 3 });
    const r = resolvePriceFromCard(blueEyes, 'LOB-EN001');
    expect(r.priceSpread).toEqual({ min: 1.5, max: 12.4, count: 3 });
    expect(r.matchQuality).toBe('exact');
  });
  it('a single-printing no-code read is quality "single" (unambiguous)', () => {
    const single: YgoCard = { id: 1, name: 'X', card_sets: [{ set_code: 'AAA-EN001', set_price: '2.00' }] };
    const r = resolvePriceFromCard(single, '');
    expect(r.matchQuality).toBe('single');
    expect(r.autoPicked).toBe(false);
  });
  it('a blind unmatched multi-print read is quality "auto"', () => {
    const r = resolvePriceFromCard(blueEyes, 'NOPE-EN001');
    expect(r.matchQuality).toBe('auto');
    expect(r.autoPicked).toBe(true);
  });
});

describe('firstCard', () => {
  it('extracts a valid card from a {data:[...]} payload', () => {
    expect(firstCard({ data: [blueEyes] })?.id).toBe(89631139);
  });
  it('returns null for an error/empty payload', () => {
    expect(firstCard({ error: 'No card matching' })).toBeNull();
    expect(firstCard({ data: [] })).toBeNull();
  });
});
