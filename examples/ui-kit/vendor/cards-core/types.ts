/**
 * Card domain types — the typed contract over the shared `inventory` /
 * `class:'Card'` collection (docs planned/yugioh-app/architecture
 * §card-metadata-contract). Until this package existed every card field lived
 * untyped on the freeform inventory `metadata` map and every reader cast
 * `unknown`; `CardMetadata` is the de-facto contract `buildCardMetadata`
 * writes, made a real type. Framework-free: no Firebase, no Stencil, no DOM.
 */

/** The inventory `class` value that marks an item as a card. */
export const CARD_CLASS = 'Card';

/** Edition read off the card face (`null` = not printed / unreadable). */
export type CardEdition = '1st' | 'unlimited' | 'limited';

/** Condition grade label (does NOT scale price). Stored as a plain string —
 *  these are the canonical values every surface writes. */
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

/** Streaming-scan async lifecycle on a placeholder row. */
export type CardScanState = 'scanning' | 'resolved' | 'needs_review';

/** Sharing groundwork (yugioh-app S5): written from day one, no UI in v1. */
export type CardVisibility = 'private' | 'public';

/**
 * The card `metadata` contract — every card-specific field riding the freeform
 * inventory `metadata` map. A TYPE alias (not an interface) on purpose: type
 * aliases get an implicit index signature, so a `CardMetadata` stays assignable
 * to the consumers' `Record<string, unknown>` / `{ [k: string]: unknown }`
 * metadata bags without casts.
 */
export type CardMetadata = {
  /** Extensibility discriminator (`'yugioh'` today). */
  game?: string;
  /** 8-digit bottom-left code (YGOPRODeck `id`); '' when unreadable. */
  passcode?: string;
  /** Printing code, e.g. `LOB-EN001` (normalized uppercase). */
  setCode?: string | null;
  setName?: string | null;
  /** `card_sets[].set_rarity`. */
  rarity?: string | null;
  /** Read off the card face; null = not printed / unreadable. */
  edition?: CardEdition | null;
  /** Grade label (`CardCondition`); defaults to 'NM'. */
  condition?: string;
  /** `${ygoprodeckId}:${setCode}` — THE priced unit (stacking keys on it). */
  printingId?: string;
  /** Monster/Spell/Trap + subtypes (YGOPRODeck `type`). */
  cardType?: string | null;
  /** Snapshot market price, USD. */
  price?: number;
  priceCurrency?: 'USD';
  /** Snapshot epoch ms. */
  priceUpdatedAt?: number;
  priceSource?: 'ygoprodeck';
  /** Vision read confidence, 0–1. */
  recognitionConfidence?: number;
  /** Low-confidence / auto-picked-printing flag. */
  needsReview?: boolean;
  /** Created via the manual fallback form. */
  manualAdd?: boolean;
  /** Sale pile (deferred; no UI). */
  forSale?: boolean;
  askingPrice?: number;
  /** GCS URL of the user's actual photo. */
  photoUrl?: string;
  /** Canonical YGOPRODeck art (also mirrored into `images[]`). */
  imageUrl?: string | null;
  /** YGOPRODeck card `id` (== passcode as a number). */
  ygoprodeckId?: number | null;
  scanState?: CardScanState;
  /** Streaming Stage-1 resolved the identity + a CARD-LEVEL price by passcode, but
   *  the exact printing isn't pinned yet — Stage 2's Gemini set-code read refines
   *  it. Cleared once the printing resolves. */
  printingPending?: boolean;
  /** Stage 2's printing refine kept failing after the retry budget, but the card
   *  stays priced at the card level (never regressed to needs-review). */
  printingRefineFailed?: boolean;
  /** Source item id when a stack was split (provenance). */
  splitFrom?: string;
  visibility?: CardVisibility;
};

/**
 * The structural item shape the pure functions in this package operate on.
 * BOTH backends satisfy it: the bot's `InventoryItemDoc` (firebase-admin side)
 * and the hub's `HubInventoryItem` (client side) — so the shared logic is
 * generic over `T extends CardItemLike` and each consumer keeps its own type.
 */
export interface CardItemLike {
  id?: string;
  name: string;
  quantity?: number | null;
  class?: string | null;
  type?: string | null;
  /** Single-valued container ref — a card is in exactly ONE container. */
  containerId?: string | null;
  /** Legacy containment (packages/app / Notion import); read via containerOf. */
  parentId?: string | null;
  isContainer?: boolean;
  /** Container flavor ('deck' | 'binder' | …; freeform, containers only). */
  kind?: string | null;
  images?: string[];
  /** Freeform metadata map (card fields = `CardMetadata`). */
  metadata?: Record<string, unknown>;
}

/** A clean, projected card — what an adapter façade hands to UI pages. */
export interface Card {
  id: string;
  name: string;
  quantity: number;
  ownerId?: string;
  containerId: string | null;
  type?: string | null;
  images: string[];
  metadata: CardMetadata;
}

/** A deck/binder/box — an ordinary inventory item with `isContainer:true`. */
export interface Container {
  id: string;
  name: string;
  /** Freeform flavor ('deck' | 'binder' | …); null = generic box. */
  kind: string | null;
  isContainer: true;
  ownerId?: string;
}

/** The freeform metadata map of an item (never null). */
export function itemMetadata(item: CardItemLike): Record<string, unknown> {
  return item.metadata ?? {};
}

/** Canonical containment on READ: prefer `containerId`, fall back to the
 *  legacy `parentId`. Writes always set `containerId`; this keeps reads robust
 *  when only `parentId` is present. */
export function containerOf(item: Pick<CardItemLike, 'containerId' | 'parentId'>): string | null {
  return item.containerId ?? item.parentId ?? null;
}
