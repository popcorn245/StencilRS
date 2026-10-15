/**
 * metadata — the CardMetadata contract writers: buildCardMetadata (migrated
 * from bucket-bot card-recognition.test.ts) + buildPrintingMetadata (migrated
 * from bucket-hub state/cards.test.ts) + edition normalization.
 */
import { describe, expect, it } from 'vitest';
import { buildCardMetadata, buildPrintingMetadata, normalizeEdition, type CardRead } from './metadata.js';
import type { CardPrice, YgoCard, YgoSet } from './pricing.js';
import type { CardItemLike } from './types.js';

describe('normalizeEdition', () => {
  it('maps face text to the stored enum', () => {
    expect(normalizeEdition('1st Edition')).toBe('1st');
    expect(normalizeEdition('Unlimited')).toBe('unlimited');
    expect(normalizeEdition('Limited')).toBe('limited');
    expect(normalizeEdition('')).toBeNull();
    expect(normalizeEdition(null)).toBeNull();
  });
});

describe('buildCardMetadata', () => {
  const read: CardRead = { name: 'Blue-Eyes White Dragon', passcode: '89631139', setCode: 'LOB-EN001', edition: '1st', confidence: 0.86 };
  const card: YgoCard = { id: 89631139, name: 'Blue-Eyes White Dragon', type: 'Normal Monster', card_images: [{ image_url: 'https://img/x.jpg' }] };
  const printing: YgoSet = { set_name: 'LOB', set_code: 'LOB-EN001', set_rarity: 'Ultra Rare', set_price: '12.40' };
  const price: CardPrice = { price: 12.4, currency: 'USD', source: 'ygoprodeck', printingId: '89631139:LOB-EN001', updatedAt: 111 };

  it('assembles the full card metadata with a price snapshot', () => {
    const m = buildCardMetadata(read, card, printing, price, { needsReview: false, condition: 'NM' });
    expect(m).toMatchObject({
      game: 'yugioh',
      passcode: '89631139',
      setCode: 'LOB-EN001',
      setName: 'LOB',
      rarity: 'Ultra Rare',
      edition: '1st',
      condition: 'NM',
      printingId: '89631139:LOB-EN001',
      price: 12.4,
      priceUpdatedAt: 111,
      priceSource: 'ygoprodeck',
      priceCurrency: 'USD',
      imageUrl: 'https://img/x.jpg',
      ygoprodeckId: 89631139,
      needsReview: false,
      visibility: 'private',
    });
  });
  it('stamps visibility:private on every card from day one (yugioh-app S5)', () => {
    const m = buildCardMetadata({ name: 'Mystery', passcode: '', setCode: '', edition: null, confidence: 0 }, null, null, null, { needsReview: true });
    expect(m.visibility).toBe('private');
  });
  it('marks needsReview + no price for an unresolved manual read', () => {
    const m = buildCardMetadata({ name: 'Mystery', passcode: '', setCode: '', edition: null, confidence: 0 }, null, null, null, { needsReview: true, manualAdd: true });
    expect(m.needsReview).toBe(true);
    expect(m.manualAdd).toBe(true);
    expect(m.price).toBeUndefined();
    expect(m.condition).toBe('NM');
  });
  it('carries the user photo when provided', () => {
    const m = buildCardMetadata(read, card, printing, price, { needsReview: false, photoUrl: 'https://gcs/photo.jpg' });
    expect(m.photoUrl).toBe('https://gcs/photo.jpg');
  });
});

describe('buildPrintingMetadata', () => {
  function card(partial: Partial<CardItemLike>): CardItemLike {
    return { id: 'x', name: 'Card', quantity: 1, class: 'Card', containerId: null, ...partial };
  }
  it('re-snapshots price + clears needsReview on a printing swap', () => {
    const c = card({ id: 'a', metadata: { ygoprodeckId: 89631139, needsReview: true, price: 1 } });
    const printing: YgoSet = { set_name: 'LOB', set_code: 'lob-en001', set_rarity: 'Ultra Rare', set_price: '12.40' };
    const patch = buildPrintingMetadata(c, printing);
    expect(patch).toMatchObject({ setCode: 'LOB-EN001', rarity: 'Ultra Rare', printingId: '89631139:LOB-EN001', price: 12.4, needsReview: false });
  });
  it('CLEARS the price to unpriced when the printing has none and no card fallback', () => {
    // Never leave a stale price from a DIFFERENT printing — the UI shows "Unpriced".
    const c = card({ id: 'a', metadata: { ygoprodeckId: 1, price: 5, priceUpdatedAt: 1 } });
    const patch = buildPrintingMetadata(c, { set_code: 'AAA-1' });
    expect(patch.price).toBeNull();
    expect(patch.priceUpdatedAt).toBeNull();
    expect(patch.needsReview).toBe(false);
    expect(patch.setCode).toBe('AAA-1');
  });
  it('falls back to the card-level tcgplayer price when the printing has none', () => {
    const c = card({ id: 'a', metadata: { ygoprodeckId: 1, price: 5 } });
    const cardObj: YgoCard = { id: 1, name: 'X', card_sets: [{ set_code: 'AAA-1' }], card_prices: [{ tcgplayer_price: '3.10' }] };
    const patch = buildPrintingMetadata(c, { set_code: 'AAA-1' }, { card: cardObj });
    expect(patch.price).toBe(3.1);
    expect(typeof patch.priceUpdatedAt).toBe('number');
  });
  it('records the read rarity, falling back to the printing set_rarity', () => {
    const read: CardRead = { name: 'X', passcode: '1', setCode: '', edition: null, confidence: 0.9, rarity: 'Secret Rare' };
    const m = buildCardMetadata(read, null, { set_code: 'A-1', set_rarity: 'Common' } as YgoSet, null, { needsReview: false });
    expect(m.rarity).toBe('Secret Rare');
    const m2 = buildCardMetadata({ ...read, rarity: '' }, null, { set_code: 'A-1', set_rarity: 'Common' } as YgoSet, null, { needsReview: false });
    expect(m2.rarity).toBe('Common');
  });
});
