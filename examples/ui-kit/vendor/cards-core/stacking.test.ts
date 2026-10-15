/**
 * stacking — the single stack-identity rule: EXACT printingId + condition +
 * CONTAINER identity (docs bucket-bot/card-capture edge-cases §dedup).
 */
import { describe, expect, it } from 'vitest';
import { findStackMatch, itemStackKey, stackKey } from './stacking.js';
import type { CardItemLike } from './types.js';

function card(partial: Partial<CardItemLike> & { id: string }): CardItemLike {
  return { name: partial.id, quantity: 1, class: 'Card', containerId: null, ...partial };
}

const blueEyesLoose = card({ id: 'a', metadata: { printingId: '89631139:LOB-EN001', condition: 'NM' } });
const blueEyesLP = card({ id: 'b', metadata: { printingId: '89631139:LOB-EN001', condition: 'LP' } });
const blueEyesInDeck = card({ id: 'c', containerId: 'deck1', metadata: { printingId: '89631139:LOB-EN001', condition: 'NM' } });
const kuriboh = card({ id: 'd', metadata: { printingId: '40640057:SDK-050', condition: 'NM' } });

describe('stackKey', () => {
  it('keys on printingId + condition + container identity', () => {
    expect(stackKey('89631139:LOB-EN001', 'NM', null)).toBe('89631139:LOB-EN001|NM|');
    expect(stackKey('89631139:LOB-EN001', 'NM', 'deck1')).toBe('89631139:LOB-EN001|NM|deck1');
  });
  it('defaults a missing condition to NM (matches the write-side default)', () => {
    expect(stackKey('x:Y', null, null)).toBe(stackKey('x:Y', 'NM', null));
    expect(stackKey('x:Y', undefined, null)).toBe(stackKey('x:Y', 'NM', null));
  });
  it('a different condition or container is a DIFFERENT key (distinct row)', () => {
    expect(stackKey('x:Y', 'NM', null)).not.toBe(stackKey('x:Y', 'LP', null));
    expect(stackKey('x:Y', 'NM', 'deck1')).not.toBe(stackKey('x:Y', 'NM', 'binder1'));
    expect(stackKey('x:Y', 'NM', 'deck1')).not.toBe(stackKey('x:Y', 'NM', null));
  });
});

describe('itemStackKey', () => {
  it('reads printingId + condition off metadata and container off the item', () => {
    expect(itemStackKey(blueEyesLoose)).toBe(stackKey('89631139:LOB-EN001', 'NM', null));
    expect(itemStackKey(blueEyesInDeck)).toBe(stackKey('89631139:LOB-EN001', 'NM', 'deck1'));
  });
  it('defaults a missing metadata condition to NM', () => {
    const noCond = card({ id: 'x', metadata: { printingId: 'p:Q' } });
    expect(itemStackKey(noCond)).toBe(stackKey('p:Q', 'NM', null));
  });
  it('falls back to legacy parentId for container identity (containerOf)', () => {
    const legacy = card({ id: 'x', containerId: null, parentId: 'binder9', metadata: { printingId: 'p:Q', condition: 'NM' } });
    expect(itemStackKey(legacy)).toBe(stackKey('p:Q', 'NM', 'binder9'));
  });
  it('returns null without a printingId (placeholders never stack by key)', () => {
    expect(itemStackKey(card({ id: 'x', metadata: { condition: 'NM' } }))).toBeNull();
    expect(itemStackKey(card({ id: 'x' }))).toBeNull();
  });
});

describe('findStackMatch', () => {
  const cards = [blueEyesLoose, blueEyesLP, blueEyesInDeck, kuriboh];

  it('finds the stack with the same printing + condition + container', () => {
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'NM', containerId: null })?.id).toBe('a');
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'NM', containerId: 'deck1' })?.id).toBe('c');
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'LP', containerId: null })?.id).toBe('b');
  });
  it('a different condition is a distinct row (no match)', () => {
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'HP', containerId: null })).toBeUndefined();
  });
  it('a different container is a distinct row (deck A never merges into binder B)', () => {
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'NM', containerId: 'binder1' })).toBeUndefined();
  });
  it('defaults the target condition to NM', () => {
    expect(findStackMatch(cards, { printingId: '40640057:SDK-050' })?.id).toBe('d');
  });
  it('excludeId skips the row being resolved (merge-on-resolve)', () => {
    expect(findStackMatch(cards, { printingId: '89631139:LOB-EN001', condition: 'NM', containerId: null }, { excludeId: 'a' })).toBeUndefined();
  });
  it('an empty printingId never matches anything', () => {
    expect(findStackMatch(cards, { printingId: '', condition: 'NM', containerId: null })).toBeUndefined();
  });
  it('never matches a row that itself has no printingId', () => {
    const placeholder = card({ id: 'p', metadata: { condition: 'NM', scanState: 'scanning' } });
    expect(findStackMatch([placeholder], { printingId: 'p:Q', condition: 'NM', containerId: null })).toBeUndefined();
  });
});
