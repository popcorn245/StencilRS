/**
 * items + portfolio — metadata readers, category display labels, container
 * icons, and the shared portfolio math (migrated from bucket-hub
 * state/cards.test.ts, extended with the bot-shape collectionValue rollup).
 */
import { describe, expect, it } from 'vitest';
import { cardMetaStr, cardPrice, categoryClassLabel, categoryLabel, containerIcon, groupCategoryLabel, needsReview } from './items.js';
import { cardsPortfolio, cardsTotal, collectionTotal, collectionValue } from './portfolio.js';
import type { CardItemLike } from './types.js';

function card(partial: Partial<CardItemLike>): CardItemLike {
  return { id: 'x', name: 'Card', quantity: 1, class: 'Card', containerId: null, isContainer: false, ...partial };
}

describe('category display labels', () => {
  it('maps class:Card + metadata.game yugioh → "Yu-Gi-Oh Card"', () => {
    expect(categoryLabel(card({ metadata: { game: 'yugioh' } }))).toBe('Yu-Gi-Oh Card');
    expect(categoryClassLabel('Card', 'yugioh')).toBe('Yu-Gi-Oh Card');
  });
  it('falls back to "Card" when the game is missing or unknown', () => {
    expect(categoryLabel(card({ metadata: {} }))).toBe('Card');
    expect(categoryLabel(card({ metadata: { game: 'pokemon-tcg' } }))).toBe('Card');
    expect(categoryClassLabel('Card', 42)).toBe('Card');
  });
  it('passes non-card classes through untouched (display only)', () => {
    expect(categoryClassLabel('Grocery', 'yugioh')).toBe('Grocery');
    expect(categoryClassLabel('', 'yugioh')).toBe('');
    expect(categoryClassLabel(null)).toBe('');
  });
  it('labels a class bucket: unanimous game → its label, mixed → "Card"', () => {
    const ygo = card({ id: 'a', metadata: { game: 'yugioh' } });
    const mtg = card({ id: 'b', metadata: { game: 'mtg' } });
    expect(groupCategoryLabel('Card', [ygo, card({ id: 'c', metadata: { game: 'yugioh' } })])).toBe('Yu-Gi-Oh Card');
    expect(groupCategoryLabel('Card', [ygo, mtg])).toBe('Card');
    expect(groupCategoryLabel('Grocery', [])).toBe('Grocery');
  });
});

describe('card metadata readers', () => {
  it('reads price + string fields off metadata', () => {
    const c = card({ metadata: { price: 12.4, setCode: 'LOB-EN001', needsReview: true } });
    expect(cardPrice(c)).toBe(12.4);
    expect(cardMetaStr(c, 'setCode')).toBe('LOB-EN001');
    expect(needsReview(c)).toBe(true);
  });
  it('returns null price / empty string when absent', () => {
    const c = card({ metadata: {} });
    expect(cardPrice(c)).toBeNull();
    expect(cardMetaStr(c, 'setCode')).toBe('');
    expect(needsReview(c)).toBe(false);
  });
});

describe('containerIcon', () => {
  it('maps deck/binder/other (case/space-tolerant)', () => {
    expect(containerIcon('deck')).toBe('🃏');
    expect(containerIcon(' Binder ')).toBe('📒');
    expect(containerIcon('box')).toBe('📦');
    expect(containerIcon(null)).toBe('📦');
  });
});

describe('portfolio', () => {
  const cards = [
    card({ id: 'a', name: 'Blue-Eyes', quantity: 2, metadata: { price: 12.4, setCode: 'LOB-EN001' } }),
    card({ id: 'b', name: 'Dark Magician', quantity: 1, metadata: { price: 8 } }),
    card({ id: 'c', name: 'Kuriboh', quantity: 3, metadata: { needsReview: true } }),
  ];
  it('sums quantity × price, excludes unpriced, ranks top (hub shape)', () => {
    expect(cardsTotal(cards)).toBeCloseTo(12.4 * 2 + 8, 5);
    expect(collectionTotal(cards)).toBe(cardsTotal(cards));
    const p = cardsPortfolio(cards);
    expect(p.count).toBe(3);
    expect(p.copies).toBe(6);
    expect(p.unpriced).toBe(1);
    expect(p.top[0].name).toBe('Blue-Eyes');
  });
  it('collectionValue (bot shape) rolls up counts + a plain top list', () => {
    const v = collectionValue(cards, 2);
    expect(v.total).toBeCloseTo(32.8, 5);
    expect(v.cardCount).toBe(3);
    expect(v.copyCount).toBe(6);
    expect(v.unpriced).toBe(1);
    expect(v.top).toEqual([
      { id: 'a', name: 'Blue-Eyes', price: 12.4, setCode: 'LOB-EN001', quantity: 2 },
      { id: 'b', name: 'Dark Magician', price: 8, setCode: null, quantity: 1 },
    ]);
  });
});
