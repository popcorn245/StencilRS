/**
 * Card item readers — pure helpers over `class:'Card'` inventory items (lifted
 * from bucket-hub state/cards). Read the card-specific fields off the freeform
 * `metadata` map; display labels for card classes. Generic over
 * `CardItemLike` so the bot's `InventoryItemDoc`, the hub's
 * `HubInventoryItem`, and the app's `Card` rows all work unchanged.
 */
import { CARD_CLASS, itemMetadata, type CardItemLike } from './types.js';

/** Whether an inventory item is a card (class:'Card'). */
export function isCard(item: CardItemLike): boolean {
  return (item.class ?? '') === CARD_CLASS;
}

/** Friendly display names per `metadata.game` on class:'Card' items. Future
 *  games register here (display-only — the stored class stays 'Card'). */
const CARD_GAME_LABELS: Record<string, string> = {
  yugioh: 'Yu-Gi-Oh Card',
  mtg: 'Magic Card',
};

/**
 * DISPLAY label for a stored class value: 'Card' + a known `metadata.game` →
 * "Yu-Gi-Oh Card"; unknown/missing game → "Card"; any other class passes
 * through. Purely cosmetic — filters, saves, and queries keep the raw class,
 * and this label must never be written back.
 */
export function categoryClassLabel(cls: string | null | undefined, game?: unknown): string {
  const c = (cls ?? '').trim();
  if (c !== CARD_CLASS) return c;
  const g = typeof game === 'string' ? game.trim().toLowerCase() : '';
  return CARD_GAME_LABELS[g] ?? CARD_CLASS;
}

/** Display category label for one item (its class + metadata.game). */
export function categoryLabel(item: CardItemLike): string {
  return categoryClassLabel(item.class, itemMetadata(item).game);
}

/** Display label for a whole class bucket (Items-tab group header / category
 *  filter option): every card agrees on one label → that label; mixed games →
 *  the raw 'Card'. Non-card classes pass through. */
export function groupCategoryLabel(cls: string, items: CardItemLike[]): string {
  if (cls !== CARD_CLASS) return cls;
  const labels = new Set(items.filter(isCard).map(categoryLabel));
  return labels.size === 1 ? [...labels][0] : CARD_CLASS;
}

/** A card's snapshot price (USD), or null when unpriced. */
export function cardPrice(item: CardItemLike): number | null {
  const p = itemMetadata(item).price;
  return typeof p === 'number' && Number.isFinite(p) ? p : null;
}

/** A string metadata field (setCode, rarity, condition, …) or ''. */
export function cardMetaStr(item: CardItemLike, key: string): string {
  const v = itemMetadata(item)[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function needsReview(item: CardItemLike): boolean {
  return itemMetadata(item).needsReview === true;
}

/** Display icon for a container flavor (🃏 deck / 📒 binder / 📦 box) — the
 *  ONE implementation (was duplicated as bot `containerIconFor` + hub
 *  `containerIcon`). */
export function containerIcon(kind: string | null | undefined): string {
  const k = String(kind ?? '').trim().toLowerCase();
  if (k === 'deck') return '🃏';
  if (k === 'binder') return '📒';
  return '📦';
}
