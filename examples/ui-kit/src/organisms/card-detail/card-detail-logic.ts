/**
 * card-detail-logic — pure helpers for `pop-card-detail` (no Stencil deps),
 * unit-tested in card-detail.spec.tsx. The component is PRESENTATIONAL: the
 * host feeds it a plain view-model and owns every API call.
 */

/** The plain card view-model the host passes in (JSON attr or property).
 *  Mirrors the hub's card `metadata` fields (Phase 1) + identity basics. */
export interface CardDetailModel {
  id: string;
  name: string;
  /** Canonical art (`metadata.imageUrl`). */
  imageUrl?: string | null;
  /** The user's own photo (`metadata.photoUrl`), toggleable when present. */
  photoUrl?: string | null;
  setCode?: string | null;
  setName?: string | null;
  rarity?: string | null;
  edition?: string | null;
  condition?: string | null;
  quantity: number;
  /** Snapshot price (USD) or null/undefined when unpriced. */
  price?: number | null;
  /** Epoch ms of the price snapshot. */
  priceUpdatedAt?: number | null;
  needsReview?: boolean;
  /** One-line reason when available (e.g. "set code unreadable"). */
  reviewReason?: string | null;
  /** 'scanning' → read-only resolving state (worker may merge-and-delete). */
  scanState?: string | null;
  /** Name of the container/binder the card lives in, for display. */
  containerName?: string | null;
  /** Whether the printing picker can populate (a passcode/ygoprodeckId
   *  exists). false → offer Rescan instead of Pick-the-printing. */
  hasPasscode?: boolean;
}

/** A binder/container option for the move action. */
export interface CardContainerOption {
  id: string;
  name: string;
}

/** Default Yu-Gi-Oh condition grades (matches core/cards.ts semantics). */
export const CARD_CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/** A non-empty string, else null (view-model field normalizer). */
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

/** Parse a `card` prop that may arrive as a JSON attr string or an object
 *  property. Returns null for anything unusable (defensive, never throws). */
export function parseCardModel(input: unknown): CardDetailModel | null {
  let raw: unknown = input;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== 'string' || !o.name) return null;
  return {
    id: typeof o.id === 'string' ? o.id : '',
    name: o.name,
    imageUrl: strOrNull(o.imageUrl),
    photoUrl: strOrNull(o.photoUrl),
    setCode: strOrNull(o.setCode),
    setName: strOrNull(o.setName),
    rarity: strOrNull(o.rarity),
    edition: strOrNull(o.edition),
    condition: strOrNull(o.condition),
    quantity: typeof o.quantity === 'number' && Number.isFinite(o.quantity) ? o.quantity : 1,
    price: typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : null,
    priceUpdatedAt: typeof o.priceUpdatedAt === 'number' && Number.isFinite(o.priceUpdatedAt) ? o.priceUpdatedAt : null,
    needsReview: o.needsReview === true,
    reviewReason: strOrNull(o.reviewReason),
    scanState: strOrNull(o.scanState),
    containerName: strOrNull(o.containerName),
    hasPasscode: o.hasPasscode !== false,
  };
}

/** Parse the `containers` prop (JSON attr string or array property) → options. */
export function parseContainers(input: unknown): CardContainerOption[] {
  let raw: unknown = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({ id: String(c.id ?? ''), name: String(c.name ?? '') }))
    .filter((c) => c.id && c.name);
}

/** True while the streaming worker is still resolving this card — the sheet
 *  renders read-only (the placeholder may be merged-and-deleted any moment). */
export function isResolving(model: CardDetailModel | null): boolean {
  return (model?.scanState ?? '') === 'scanning';
}

/** "$4.55" or "unpriced". */
export function formatPrice(price: number | null | undefined): string {
  return typeof price === 'number' && Number.isFinite(price) ? `$${price.toFixed(2)}` : 'unpriced';
}

/** Compact relative time for "as of …" (just now / 5m ago / 3h ago / 2d ago /
 *  Jan 5). Empty string for a missing/invalid timestamp. */
export function relativeTime(ts: number | null | undefined, now = Date.now()): string {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return '';
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The identity meta line parts (set code · rarity · edition), skipping blanks. */
export function identityParts(model: CardDetailModel): string[] {
  return [model.setCode, model.rarity, model.edition].filter((p): p is string => !!p && !!p.trim());
}
