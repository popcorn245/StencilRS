/**
 * Card metadata assembly — the functions that WRITE the `CardMetadata`
 * contract. `buildCardMetadata` (lifted from bucket-bot card-recognition) is
 * the canonical snapshot off a vision read + resolved printing/price;
 * `buildPrintingMetadata` (lifted from bucket-hub state/cards) is the
 * printing-picker swap patch. Pure: no I/O, no vision calls — the read/resolve
 * pipelines stay with the bot.
 */
import { cardArtUrl, cardLevelPrice, makePrintingId, normalizeSetCode, parseMoney, type CardPrice, type YgoCard, type YgoSet } from './pricing.js';
import { itemMetadata, type CardEdition, type CardItemLike, type CardMetadata } from './types.js';

/** The strict-JSON read off a card face (vision-LLM OCR output). */
export interface CardRead {
  name: string;
  passcode: string;
  setCode: string;
  edition: CardEdition | null;
  confidence: number;
  /** Rarity read off the foiling/lettering (e.g. `"Ultra Rare"`); '' when unsure.
   *  Optional so existing `CardRead` literals stay valid. Narrows an unmatched
   *  set code and is stored on `metadata.rarity` when no printing is resolved. */
  rarity?: string;
}

/** Normalize an edition string off the face → the stored enum (or null). */
export function normalizeEdition(raw: unknown): CardEdition | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === 'null' || s === 'none') return null;
  if (s.includes('1st') || s.includes('first')) return '1st';
  if (s.includes('limited') && !s.includes('un')) return 'limited';
  if (s.includes('unlimited') || s.includes('unl')) return 'unlimited';
  return null;
}

/** Assemble the card `metadata` map from a read + resolved card/printing/price. */
export function buildCardMetadata(
  read: CardRead,
  card: YgoCard | null,
  printing: YgoSet | null,
  price: CardPrice | null,
  opts: { needsReview: boolean; condition?: string; photoUrl?: string | null; manualAdd?: boolean },
): CardMetadata {
  const setCode = printing?.set_code ? normalizeSetCode(printing.set_code) : read.setCode || null;
  const imageUrl = card ? cardArtUrl(card) : null;
  const meta: CardMetadata = {
    game: 'yugioh',
    passcode: read.passcode || (card ? String(card.id) : ''),
    setCode,
    setName: printing?.set_name ?? null,
    // The rarity READ off the card face wins over the printing's `set_rarity`: a
    // blindly auto-picked printing may be the wrong one, but the foiling the
    // model saw is on the physical card. Fall back to the printing when unread.
    rarity: (read.rarity && read.rarity.trim()) || printing?.set_rarity || null,
    edition: read.edition,
    condition: opts.condition || 'NM',
    cardType: card?.type ?? null,
    recognitionConfidence: read.confidence,
    needsReview: opts.needsReview,
    manualAdd: opts.manualAdd === true,
    forSale: false,
    priceCurrency: 'USD',
    priceSource: 'ygoprodeck',
    imageUrl,
    ygoprodeckId: card?.id ?? null,
    // Sharing groundwork (yugioh-app S5): every card is stamped from day one so
    // public profiles never need a second migration. No sharing UI in v1.
    visibility: 'private',
  };
  if (card && setCode) meta.printingId = makePrintingId(card.id, setCode);
  if (price) {
    meta.price = price.price;
    meta.priceUpdatedAt = price.updatedAt;
    meta.printingId = price.printingId;
  }
  if (opts.photoUrl) meta.photoUrl = opts.photoUrl;
  return meta;
}

/**
 * Build the metadata patch for swapping a card's printing (picker → PATCH).
 * The price ALWAYS follows the chosen printing so the detail sheet never shows a
 * stale number from a different printing:
 *  - the chosen printing's `set_price` when it parses; else
 *  - the card-level tcgplayer price (when the resolving `card` is passed) — some
 *    printings carry no `set_price` even though the card has a market price; else
 *  - CLEARED to unpriced (`price`/`priceUpdatedAt` → null) so the UI shows
 *    "Unpriced" rather than the old printing's leftover value.
 * Always stamps `setCode` + `rarity` + `printingId` from the chosen printing and
 * clears `needsReview` (the ambiguity is resolved). `opts.card` is optional so
 * the 2-arg `(item, printing)` callers keep working.
 */
export function buildPrintingMetadata(
  item: CardItemLike,
  printing: YgoSet,
  opts: { card?: YgoCard | null } = {},
): Record<string, unknown> {
  const existing = itemMetadata(item);
  const ygoprodeckId = existing.ygoprodeckId ?? existing.passcode ?? item.id;
  const setCode = String(printing.set_code ?? '').toUpperCase();
  // Price follows the printing: its set_price, else the card-level fallback,
  // else cleared to unpriced (never a stale number from the prior printing).
  const price = parseMoney(printing.set_price) ?? (opts.card ? cardLevelPrice(opts.card) : null);
  const patch: Record<string, unknown> = {
    ...existing,
    setCode,
    setName: printing.set_name ?? existing.setName ?? null,
    rarity: printing.set_rarity ?? existing.rarity ?? null,
    printingId: `${ygoprodeckId}:${setCode}`,
    needsReview: false,
    priceSource: 'ygoprodeck',
    priceCurrency: 'USD',
  };
  if (price !== null) {
    patch.price = price;
    patch.priceUpdatedAt = Date.now();
  } else {
    // No price for this printing (and no card-level fallback) → clear to unpriced.
    patch.price = null;
    patch.priceUpdatedAt = null;
  }
  return patch;
}
