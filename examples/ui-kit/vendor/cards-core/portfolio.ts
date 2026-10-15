/**
 * Portfolio-value math — pure Σ quantity × price over already-read cards
 * (unpriced excluded). ONE implementation for what used to be bot
 * `collectionTotal`/`collectionValue` and hub `cardsTotal`/`cardsPortfolio`
 * (same formula, two shapes of "top" rollup — both kept, both over the shared
 * `cardPrice`).
 */
import { cardPrice } from './items.js';
import { itemMetadata, type CardItemLike } from './types.js';

/** Σ quantity × price across priced cards. */
export function collectionTotal(cards: CardItemLike[]): number {
  return cards.reduce((s, c) => s + (cardPrice(c) ?? 0) * (c.quantity ?? 0), 0);
}

/** Alias — the hub's historical name for the same sum. */
export const cardsTotal = collectionTotal;

export interface CollectionValue {
  total: number;
  cardCount: number;
  copyCount: number;
  unpriced: number;
  top: Array<{ id: string; name: string; price: number; setCode: string | null; quantity: number }>;
}

/** Portfolio value + most-valuable N over a set of cards (unpriced excluded);
 *  the bot's chat-rollup shape (plain top entries, not items). */
export function collectionValue(cards: CardItemLike[], topN = 5): CollectionValue {
  let unpriced = 0;
  let copyCount = 0;
  for (const c of cards) {
    copyCount += c.quantity ?? 0;
    if (cardPrice(c) === null) unpriced++;
  }
  const top = cards
    .map((c) => ({
      id: String(c.id ?? ''),
      name: c.name,
      price: cardPrice(c) ?? 0,
      setCode: (itemMetadata(c).setCode as string) ?? null,
      quantity: c.quantity ?? 0,
    }))
    .filter((c) => c.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, topN);
  return { total: collectionTotal(cards), cardCount: cards.length, copyCount, unpriced, top };
}

export interface CardsPortfolio<T extends CardItemLike = CardItemLike> {
  total: number;
  count: number;
  copies: number;
  unpriced: number;
  top: T[];
}

/** Portfolio summary for stat tiles (the hub's shape: `top` keeps the items). */
export function cardsPortfolio<T extends CardItemLike>(items: T[], topN = 3): CardsPortfolio<T> {
  let unpriced = 0;
  let copies = 0;
  for (const c of items) {
    copies += c.quantity ?? 0;
    if (cardPrice(c) === null) unpriced++;
  }
  const top = [...items].filter((c) => (cardPrice(c) ?? 0) > 0).sort((a, b) => (cardPrice(b) ?? 0) - (cardPrice(a) ?? 0)).slice(0, topN);
  return { total: collectionTotal(items), count: items.length, copies, unpriced, top };
}
