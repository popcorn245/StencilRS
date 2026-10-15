/**
 * Display-time card grouping — collapse every printing / rarity / condition of
 * the SAME card into ONE stacked tile for the collection view. This is a READ
 * concern only: it never merges rows on disk (that stays the write-time
 * `stackKey` in stacking.ts, which keys on printingId+condition+container).
 *
 * The grouping key is deliberately looser than the stack key: two Blue-Eyes of
 * different printings (or a printed card and its unresolved manual add of the
 * same passcode) collapse into a single tile, and tapping in reveals the
 * per-printing / per-rarity / per-condition members. Genuinely-unidentified
 * cards (no passcode, no ygoprodeckId, no name) each stand alone.
 */
import type { Card } from './types.js';

/** One collapsed collection tile — a representative card plus every member. */
export interface CardGroup<T extends Card = Card> {
  /** Stable group identity (ygoprodeckId → passcode → name → row id). */
  key: string;
  /** The card the tile renders as — highest quantity, else the first member. */
  representative: T;
  /** Sum of every member's quantity — the stacked tile badge. */
  totalQty: number;
  /** Every card row that collapsed into this group (always ≥ 1). */
  members: T[];
}

/**
 * The display grouping key: `ygoprodeckId ?? passcode ?? 'name:'+normalizedName`
 * so different printings of one card collapse, falling back to the row id when a
 * card is genuinely unidentified (no id, passcode, or name) so it stands alone.
 */
export function displayGroupKey(card: Card): string {
  const meta = card.metadata ?? {};
  const ygoId = meta.ygoprodeckId;
  if (ygoId != null && String(ygoId).trim() !== '') return `ygo:${ygoId}`;
  const passcode = String(meta.passcode ?? '').trim();
  if (passcode) return `pass:${passcode}`;
  const name = (card.name ?? '').trim().toLowerCase();
  if (name) return `name:${name}`;
  return `id:${card.id}`;
}

/**
 * Group cards for the collection view: one `CardGroup` per distinct card
 * identity, in first-appearance order (the caller has already sorted/filtered —
 * e.g. by name, or to the active container). Members keep their input order; the
 * representative is the highest-quantity member (ties keep the first).
 */
export function groupCardsForDisplay<T extends Card>(cards: T[]): CardGroup<T>[] {
  const byKey = new Map<string, T[]>();
  const order: string[] = [];
  for (const card of cards) {
    const key = displayGroupKey(card);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(card);
    } else {
      byKey.set(key, [card]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const members = byKey.get(key)!;
    let representative = members[0];
    let totalQty = 0;
    for (const m of members) {
      const q = typeof m.quantity === 'number' ? m.quantity : 0;
      totalQty += q;
      if (q > (representative.quantity ?? 0)) representative = m;
    }
    return { key, representative, totalQty, members };
  });
}
