/**
 * Decks & Binders strip — pure helpers for a deck/binder chip row (lifted from
 * bucket-hub state/deck-strip). A "deck-like" container is any container whose
 * `kind` is 'deck' or 'binder'; entries carry the card count + total value of
 * the cards inside, computed from the ALREADY-LOADED items list (cards carry
 * containerId — no extra fetch).
 */
import { cardPrice, containerIcon, isCard } from './items.js';
import type { CardItemLike } from './types.js';

export type DeckKind = 'deck' | 'binder';

/** One chip in the strip: identity + the cards-inside rollup. */
export interface DeckStripEntry {
  id: string;
  name: string;
  kind: DeckKind;
  /** Display icon (🃏 deck / 📒 binder) — mirrors containerIcon. */
  icon: string;
  /** Distinct card rows inside (matches the filtered grid's tile count). */
  count: number;
  /** Physical cards inside (Σ quantity — the number a deck player cares about). */
  copies: number;
  /** Σ price × quantity across the PRICED cards inside (USD). */
  value: number;
}

/** The deck-like kind of a container ('deck' | 'binder'), or null for anything
 *  else (generic boxes, non-containers). Kind matching is case/space-tolerant. */
export function deckKindOf(item: Pick<CardItemLike, 'isContainer' | 'kind'>): DeckKind | null {
  if (!item.isContainer) return null;
  const k = String(item.kind ?? '').trim().toLowerCase();
  return k === 'deck' || k === 'binder' ? k : null;
}

/** Whether a container belongs in the Decks & Binders strip. */
export function isDeckLike(item: Pick<CardItemLike, 'isContainer' | 'kind'>): boolean {
  return deckKindOf(item) !== null;
}

/** The card subset inside a container (`null` = no filter → all cards). */
export function cardsInContainer<T extends Pick<CardItemLike, 'containerId'>>(cards: T[], containerId: string | null): T[] {
  return containerId ? cards.filter((c) => c.containerId === containerId) : cards;
}

/**
 * Build the strip's entries from the panel's items list: one per deck/binder
 * container, each with the count / copies / value of the class:'Card' items
 * whose containerId points at it. Sorted by name (case-insensitive).
 */
export function deckStripEntries(items: CardItemLike[]): DeckStripEntry[] {
  const rollup = new Map<string, { count: number; copies: number; value: number }>();
  const decks: Array<{ item: CardItemLike; kind: DeckKind }> = [];
  for (const it of items) {
    const kind = deckKindOf(it);
    if (kind) {
      decks.push({ item: it, kind });
      const id = String(it.id ?? '');
      if (!rollup.has(id)) rollup.set(id, { count: 0, copies: 0, value: 0 });
    }
  }
  if (!decks.length) return [];
  for (const it of items) {
    if (it.isContainer || !isCard(it) || !it.containerId) continue;
    const acc = rollup.get(it.containerId);
    if (!acc) continue;
    const qty = it.quantity ?? 0;
    acc.count++;
    acc.copies += qty;
    acc.value += (cardPrice(it) ?? 0) * qty;
  }
  return decks
    .map(({ item, kind }) => ({
      id: String(item.id ?? ''),
      name: item.name,
      kind,
      icon: containerIcon(item.kind),
      ...rollup.get(String(item.id ?? ''))!,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
