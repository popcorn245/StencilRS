/**
 * display-grouping — collapse printings/rarities/conditions of the SAME card
 * into one tile (READ concern), keeping unidentified cards standing alone.
 */
import { describe, expect, it } from 'vitest';
import { displayGroupKey, groupCardsForDisplay, type CardGroup } from './display-grouping.js';
import type { Card } from './types.js';

function card(partial: Partial<Card> & { id: string }): Card {
  return { id: partial.id, name: partial.id, quantity: 1, containerId: null, images: [], metadata: {}, ...partial };
}

describe('displayGroupKey', () => {
  it('prefers ygoprodeckId, then passcode, then normalized name', () => {
    expect(displayGroupKey(card({ id: 'a', metadata: { ygoprodeckId: 89631139, passcode: '89631139' } }))).toBe('ygo:89631139');
    expect(displayGroupKey(card({ id: 'b', metadata: { passcode: '89631139' } }))).toBe('pass:89631139');
    expect(displayGroupKey(card({ id: 'c', name: 'Blue-Eyes White Dragon', metadata: {} }))).toBe('name:blue-eyes white dragon');
  });
  it('falls back to the row id when a card is genuinely unidentified', () => {
    expect(displayGroupKey(card({ id: 'z', name: '', metadata: {} }))).toBe('id:z');
  });
});

describe('groupCardsForDisplay', () => {
  it('collapses different printings/rarities/conditions of the same card', () => {
    const cards = [
      card({ id: 'a', name: 'Blue-Eyes', quantity: 1, metadata: { ygoprodeckId: 89631139, printingId: '89631139:LOB-EN001', condition: 'NM' } }),
      card({ id: 'b', name: 'Blue-Eyes', quantity: 2, metadata: { ygoprodeckId: 89631139, printingId: '89631139:SDK-001', condition: 'LP' } }),
    ];
    const groups = groupCardsForDisplay(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('ygo:89631139');
    expect(groups[0].totalQty).toBe(3);
    expect(groups[0].members.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('picks the highest-quantity member as the representative (ties keep the first)', () => {
    const cards = [
      card({ id: 'a', quantity: 1, metadata: { passcode: '111' } }),
      card({ id: 'b', quantity: 5, metadata: { passcode: '111' } }),
    ];
    expect(groupCardsForDisplay(cards)[0].representative.id).toBe('b');
    const tie = [
      card({ id: 'x', quantity: 2, metadata: { passcode: '222' } }),
      card({ id: 'y', quantity: 2, metadata: { passcode: '222' } }),
    ];
    expect(groupCardsForDisplay(tie)[0].representative.id).toBe('x');
  });

  it('keeps genuinely-unidentified cards (no id/passcode/name) as separate groups', () => {
    const cards = [card({ id: 'p1', name: '', metadata: {} }), card({ id: 'p2', name: '', metadata: {} })];
    const groups = groupCardsForDisplay(cards);
    expect(groups).toHaveLength(2);
    expect(groups.map((g: CardGroup) => g.key)).toEqual(['id:p1', 'id:p2']);
  });

  it('collapses same-passcode cards even when one lacks a printingId (the "some stack, some do not" case)', () => {
    const cards = [
      card({ id: 'resolved', metadata: { passcode: '46986414', printingId: '46986414:LOB-EN005' } }),
      card({ id: 'manual', metadata: { passcode: '46986414' } }), // no printingId → never write-stacks
    ];
    const groups = groupCardsForDisplay(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(2);
  });

  it('preserves first-appearance order of groups', () => {
    const cards = [
      card({ id: 'a', metadata: { passcode: '1' } }),
      card({ id: 'b', metadata: { passcode: '2' } }),
      card({ id: 'a2', metadata: { passcode: '1' } }),
    ];
    expect(groupCardsForDisplay(cards).map((g) => g.key)).toEqual(['pass:1', 'pass:2']);
  });
});
