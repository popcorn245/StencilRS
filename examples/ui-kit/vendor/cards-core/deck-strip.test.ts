/**
 * deck-strip — deck/binder chip-row derivation (migrated from bucket-hub
 * state/deck-strip.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { cardsInContainer, deckKindOf, deckStripEntries, isDeckLike } from './deck-strip.js';
import type { CardItemLike } from './types.js';

function item(partial: Partial<CardItemLike>): CardItemLike {
  return { id: 'x', name: 'Item', quantity: 1, class: null, containerId: null, isContainer: false, ...partial };
}
const deck = (id: string, name: string, kind = 'deck') => item({ id, name, isContainer: true, kind });
const card = (id: string, containerId: string | null, qty = 1, price?: number) =>
  item({ id, name: id, class: 'Card', containerId, quantity: qty, ...(price !== undefined ? { metadata: { price } } : {}) });

describe('deckKindOf / isDeckLike', () => {
  it('recognizes deck and binder containers', () => {
    expect(deckKindOf(deck('d', 'Dragons', 'deck'))).toBe('deck');
    expect(deckKindOf(deck('b', 'Bulk', 'binder'))).toBe('binder');
    expect(isDeckLike(deck('d', 'Dragons'))).toBe(true);
  });
  it('is tolerant of case and whitespace in kind', () => {
    expect(deckKindOf(deck('d', 'Dragons', ' Deck '))).toBe('deck');
    expect(deckKindOf(deck('b', 'Bulk', 'BINDER'))).toBe('binder');
  });
  it('rejects generic boxes, kindless containers, and non-containers', () => {
    expect(deckKindOf(deck('x', 'Tote', ''))).toBeNull();
    expect(deckKindOf(item({ isContainer: true }))).toBeNull();
    expect(deckKindOf(item({ isContainer: true, kind: 'box' }))).toBeNull();
    expect(deckKindOf(item({ kind: 'deck' }))).toBeNull(); // not a container
  });
});

describe('cardsInContainer', () => {
  const cards = [card('a', 'd1'), card('b', 'd2'), card('c', null)];
  it('filters to the container', () => {
    expect(cardsInContainer(cards, 'd1').map((c) => c.id)).toEqual(['a']);
  });
  it('null containerId = no filter (all cards, same array)', () => {
    expect(cardsInContainer(cards, null)).toBe(cards);
  });
  it('unknown container yields empty', () => {
    expect(cardsInContainer(cards, 'nope')).toEqual([]);
  });
});

describe('deckStripEntries', () => {
  it('returns [] when no deck-like containers exist', () => {
    expect(deckStripEntries([item({ isContainer: true, kind: 'box' }), card('a', null)])).toEqual([]);
  });

  it('rolls up count, copies, and value per deck', () => {
    const items = [
      deck('d1', 'Dragons'),
      card('blue-eyes', 'd1', 3, 12.5),
      card('kuriboh', 'd1', 1), // unpriced — counts, adds no value
      card('loose', null, 5, 99), // loose — never counted
    ];
    const [e] = deckStripEntries(items);
    expect(e.id).toBe('d1');
    expect(e.icon).toBe('🃏');
    expect(e.count).toBe(2);
    expect(e.copies).toBe(4);
    expect(e.value).toBeCloseTo(37.5, 5);
  });

  it('scopes cards to their own container and zeroes empty decks', () => {
    const items = [
      deck('d1', 'Dragons'),
      deck('b1', 'Trade Binder', 'binder'),
      deck('empty', 'New Deck'),
      item({ id: 'box1', name: 'Tote', isContainer: true, kind: 'box' }),
      card('a', 'd1', 2, 10),
      card('b', 'b1', 1, 5),
      card('boxed', 'box1', 1, 100), // inside a BOX — not in the strip
    ];
    const entries = deckStripEntries(items);
    expect(entries.map((e) => e.id)).toEqual(['d1', 'empty', 'b1']); // name-sorted
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    expect(byId.d1.value).toBe(20);
    expect(byId.b1.kind).toBe('binder');
    expect(byId.b1.icon).toBe('📒');
    expect(byId.empty.count).toBe(0);
    expect(byId.empty.copies).toBe(0);
    expect(byId.empty.value).toBe(0);
  });

  it('ignores non-card items and nested containers inside a deck', () => {
    const items = [
      deck('d1', 'Dragons'),
      item({ id: 'sleeves', name: 'Sleeves', class: 'Supplies', containerId: 'd1', quantity: 60 }),
      item({ id: 'inner', name: 'Inner box', isContainer: true, kind: 'box', containerId: 'd1' }),
      card('a', 'd1', 1, 2),
    ];
    const [e] = deckStripEntries(items);
    expect(e.count).toBe(1);
    expect(e.copies).toBe(1);
    expect(e.value).toBe(2);
  });

  it('sorts by name case-insensitively', () => {
    const entries = deckStripEntries([deck('z', 'zebra deck'), deck('a', 'Apple'), deck('m', 'main')]);
    expect(entries.map((e) => e.name)).toEqual(['Apple', 'main', 'zebra deck']);
  });
});
