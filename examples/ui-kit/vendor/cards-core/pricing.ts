/**
 * Pure card-pricing helpers over the YGOPRODeck data shapes — printing match,
 * money parsing, price fallback (docs bucket-bot/card-capture/architecture
 * §pricing-provider-abstraction). Extracted from bucket-bot's card-pricing so
 * the bot, the hub, and the yugioh app share ONE implementation; in particular
 * `parseMoney` replaces the character-identical `parseSetPrice` copy that
 * lived in bucket-hub. No I/O here — the HTTP provider (`fetch` + env) stays
 * with each consumer (the bot's `createYgoprodeckProvider`).
 */

/** A YGOPRODeck `card_sets[]` printing (set + rarity + edition → price). */
export interface YgoSet {
  set_name?: string;
  set_code?: string;
  set_rarity?: string;
  set_rarity_code?: string;
  set_price?: string;
  set_edition?: string;
}

/** One YGOPRODeck `card_prices[]` block (all USD). */
export interface YgoCardPrices {
  cardmarket_price?: string;
  tcgplayer_price?: string;
  ebay_price?: string;
  amazon_price?: string;
  coolstuffinc_price?: string;
}

export interface YgoCardImage {
  image_url?: string;
  image_url_small?: string;
}

/** TCG banlist statuses YGOPRODeck reports (`banlist_info.ban_tcg`). */
export interface YgoBanlistInfo {
  ban_tcg?: string;
  ban_ocg?: string;
  ban_goat?: string;
}

/** The subset of a YGOPRODeck card we consume. */
export interface YgoCard {
  id: number;
  name: string;
  type?: string; // 'Effect Monster' | 'Spell Card' | 'Trap Card' | …
  frameType?: string; // 'effect'|'normal'|'spell'|'trap'|'fusion'|'synchro'|'xyz'|'link'|'*_pendulum'|…
  desc?: string;
  // Gameplay fields (already returned by cardinfo.php; parse-only — docs
  // planned/yugioh-playtest/architecture §the-ygocard-gameplay-extension):
  race?: string; // monster Type ('Pyro', 'Spellcaster', …) / Spell-Trap subtype
  attribute?: string; // 'FIRE' | 'DARK' | … (monsters only)
  level?: number; // level / rank (absent on links)
  linkval?: number; // link rating (links only)
  scale?: number; // pendulum scale
  atk?: number;
  def?: number; // absent on links
  archetype?: string; // 'Snake-Eye', 'Fire King', …
  banlist_info?: YgoBanlistInfo;
  card_sets?: YgoSet[];
  card_prices?: YgoCardPrices[];
  card_images?: YgoCardImage[];
}

/** A price snapshot stamped onto a card's `metadata`. */
export interface CardPrice {
  price: number;
  currency: 'USD';
  source: 'ygoprodeck';
  printingId: string;
  updatedAt: number;
}

export interface PriceForInput {
  passcode?: string;
  name?: string;
  setCode?: string;
  /** Read rarity (Common, Ultra Rare, …) — narrows an unmatched multi-print. */
  rarity?: string;
}

/**
 * How a printing was chosen for pricing — lets callers make a principled
 * needsReview decision (a confident match should NOT be flagged; only a BLIND
 * guess on a wide price spread should):
 *  - `exact`  the read set code matched a printing byte-for-byte (normalized).
 *  - `fuzzy`  the read set code matched exactly ONE printing after OCR-confusion
 *             repair (`O↔0`, `I/l↔1`, `S↔5`, `B↔8`) within an edit-distance budget.
 *  - `rarity` no code match, but the read rarity narrowed the printings to one.
 *  - `single` a one-printing card with no read code — unambiguous by construction.
 *  - `passcode` a card resolved by a CONFIDENT draw2 passcode with NO printing
 *             pinned yet (the streaming worker's Stage-1 card-level price); the
 *             identity is certain, only the exact printing is still pending, so it
 *             must NOT be flagged for review purely for lacking a set code.
 *  - `auto`   a blind median-price guess (the old fallback); the ONLY quality a
 *             caller should ever consider flagging for review.
 */
export type MatchQuality = 'exact' | 'fuzzy' | 'rarity' | 'single' | 'passcode' | 'auto';

/** The price spread across a card's priced printings — how much a wrong blind
 *  auto-pick would actually cost (callers gate review on a WIDE spread). */
export interface PriceSpread {
  min: number;
  max: number;
  count: number;
}

/** Resolve identity + printing → price. Never throws; `null` on a total miss. */
export interface CardPriceResolved {
  card: YgoCard;
  printing?: YgoSet;
  price: CardPrice | null;
  /** True when no set-code/rarity match forced a blind auto-pick (→ maybe review). */
  autoPicked: boolean;
  /** How the printing was chosen (exact/fuzzy/rarity/single vs blind auto). */
  matchQuality?: MatchQuality;
  /** Min/max/count over the card's priced printings (null when none priced). */
  priceSpread?: PriceSpread | null;
}

export interface CardPriceProvider {
  name: string;
  priceFor(input: PriceForInput): Promise<CardPriceResolved | null>;
  /** All printings for an already-known card (the printing picker). */
  printingsFor(passcode: string): Promise<{ card: YgoCard; sets: YgoSet[] } | null>;
}

// ── pure helpers ─────────────────────────────────────────────────────────────

/** Normalize a set code for matching: trim + uppercase (`lob-en001` → `LOB-EN001`). */
export function normalizeSetCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

/** Composite priced-unit id: `${ygoprodeckId}:${setCode}`. */
export function makePrintingId(cardId: number | string, setCode: string): string {
  return `${cardId}:${normalizeSetCode(setCode)}`;
}

/**
 * Parse a YGOPRODeck money string (`"12.40"`) → a positive number, else null.
 * THE single implementation — formerly duplicated character-for-character as
 * bucket-bot `parseMoney` and bucket-hub `parseSetPrice`.
 */
export function parseMoney(raw: unknown): number | null {
  const n = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Exact set-code match against a card's printings (case-insensitive). */
export function matchPrinting(card: YgoCard, setCode?: string): YgoSet | undefined {
  const want = normalizeSetCode(setCode);
  if (!want) return undefined;
  return (card.card_sets ?? []).find((s) => normalizeSetCode(s.set_code) === want);
}

/**
 * A comparison key that collapses the character pairs a vision model most often
 * confuses when reading the tiny (~10px) set-code text, so an OCR wobble still
 * lines up with the true printing: `O→0`, `I/L→1`, `S→5`, `B→8` (all mapped to
 * the DIGIT so the collapse is symmetric on both the read and the candidate),
 * then non-alphanumerics (the dash/spaces) are dropped. Pure. `'LOB-EN0O1'` and
 * `'LOB-EN001'` both key to `'10BEN001'`.
 */
export function ocrKey(raw: unknown): string {
  return normalizeSetCode(raw)
    .replace(/[OILSB]/g, (c) => ({ O: '0', I: '1', L: '1', S: '5', B: '8' })[c] ?? c)
    .replace(/[^A-Z0-9]/g, '');
}

/** Levenshtein edit distance between two strings (pure; small codes only). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Fuzzy set-code match: after OCR-confusion repair (`ocrKey`), the ONE printing
 * within an edit-distance budget of the read code (≤1, or ≤2 for long codes of
 * ≥8 chars where more digits leave room for two wobbles). Returns undefined when
 * NOTHING is close OR more than one printing is close (ambiguous → not confident,
 * so upstream still auto-picks). Never repairs a code the reader left blank.
 */
export function fuzzyMatchPrinting(card: YgoCard, setCode?: string): YgoSet | undefined {
  const want = ocrKey(setCode);
  if (!want) return undefined;
  const budget = want.length >= 8 ? 2 : 1;
  const within = (card.card_sets ?? []).filter((s) => {
    const have = ocrKey(s.set_code);
    return have !== '' && editDistance(want, have) <= budget;
  });
  return within.length === 1 ? within[0] : undefined;
}

/**
 * Normalize a rarity label to a comparison key so the vision read (`"Ultra"` or
 * `"Ultra Rare"`) lines up with the printing's `set_rarity` (`"Ultra Rare"`):
 * uppercase, strip punctuation, collapse whitespace, then drop a trailing
 * `" RARE"` word (`"ULTRA RARE"`/`"ULTRA"` → `"ULTRA"`, `"SECRET RARE"` →
 * `"SECRET"`, `"PRISMATIC SECRET RARE"` → `"PRISMATIC SECRET"`) — but keep bare
 * `"RARE"` and `"COMMON"` intact. Pure.
 */
export function normalizeRarity(raw: unknown): string {
  const s = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || s === 'RARE') return s;
  return s.replace(/ RARE$/, '');
}

/**
 * "Most likely" printing when the set code is missing/unmatched: the printing
 * whose `set_price` is nearest the MEDIAN of all priced printings (a documented,
 * not-silent heuristic — docs edge-cases §ambiguous-printings). Falls back to the
 * first printing when none carry a price.
 */
export function pickLikelyPrinting(card: YgoCard): YgoSet | undefined {
  return pickLikelyFrom(card.card_sets ?? []);
}

/** `pickLikelyPrinting` over an arbitrary printing subset (median-nearest by
 *  price; first when none are priced). Used to narrow a rarity-filtered set. */
export function pickLikelyFrom(sets: YgoSet[]): YgoSet | undefined {
  if (!sets.length) return undefined;
  const priced = sets
    .map((s) => ({ s, p: parseMoney(s.set_price) }))
    .filter((x): x is { s: YgoSet; p: number } => x.p !== null)
    .sort((a, b) => a.p - b.p);
  if (!priced.length) return sets[0];
  const median = priced[Math.floor((priced.length - 1) / 2)].p;
  let best = priced[0];
  for (const cand of priced) if (Math.abs(cand.p - median) < Math.abs(best.p - median)) best = cand;
  return best.s;
}

/** Min/max/count over a card's priced printings (null when NONE are priced) —
 *  how much a wrong blind auto-pick would actually cost. */
export function pricedSpread(card: YgoCard): PriceSpread | null {
  const prices = (card.card_sets ?? [])
    .map((s) => parseMoney(s.set_price))
    .filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices), count: prices.length };
}

/** Card-level fallback price: `card_prices[0].tcgplayer_price` (USD). */
export function cardLevelPrice(card: YgoCard): number | null {
  return parseMoney(card.card_prices?.[0]?.tcgplayer_price);
}

/** The canonical card art url (mirrored into images[]). */
export function cardArtUrl(card: YgoCard): string | null {
  return card.card_images?.[0]?.image_url ?? null;
}

/**
 * Resolve a printing + price from a card and a read set code (pure). Tries, in
 * order of decreasing confidence:
 *   1. `exact`  — the read set code matches a printing byte-for-byte (normalized).
 *   2. `fuzzy`  — after OCR-confusion repair it matches exactly ONE printing.
 *   3. `rarity` — the read rarity narrows the printings to exactly one; if it
 *                 narrows to a subset >1 we median-pick WITHIN that subset (still
 *                 a blind auto, but a better-informed one).
 *   4. `single` — a one-printing card with no read code (unambiguous).
 *   5. `auto`   — a blind median-price guess (the old behavior).
 * Only quality `auto` sets `autoPicked` (→ the caller MAY flag for review — but
 * see `priceSpread`: a blind guess on cheap/close printings barely matters).
 * Price = the chosen printing's `set_price`, falling back to the card-level
 * tcgplayer price. Value is null only when nothing is priceable.
 *
 * The signature stays backward-compatible: the 2-arg `(card, setCode)` callers
 * keep working; `opts.rarity` is the new optional narrowing hint.
 */
export function resolvePriceFromCard(
  card: YgoCard,
  setCode?: string,
  opts?: { rarity?: string },
): { printing?: YgoSet; value: number | null; autoPicked: boolean; matchQuality: MatchQuality; priceSpread: PriceSpread | null } {
  const priceSpread = pricedSpread(card);
  const priceOf = (p?: YgoSet): number | null => (p ? parseMoney(p.set_price) : null) ?? cardLevelPrice(card);
  const sets = card.card_sets ?? [];

  // 1. Exact normalized set-code match (highest confidence).
  const exact = matchPrinting(card, setCode);
  if (exact) return { printing: exact, value: priceOf(exact), autoPicked: false, matchQuality: 'exact', priceSpread };

  // 2. Fuzzy set-code match — OCR-confusion repair pins exactly one printing.
  const fuzzy = fuzzyMatchPrinting(card, setCode);
  if (fuzzy) return { printing: fuzzy, value: priceOf(fuzzy), autoPicked: false, matchQuality: 'fuzzy', priceSpread };

  // 3. Rarity-narrowed pick (no code match, but the read rarity disambiguates).
  const rarity = normalizeRarity(opts?.rarity);
  if (rarity) {
    const byRarity = sets.filter((s) => normalizeRarity(s.set_rarity) === rarity);
    if (byRarity.length === 1) {
      return { printing: byRarity[0], value: priceOf(byRarity[0]), autoPicked: false, matchQuality: 'rarity', priceSpread };
    }
    if (byRarity.length > 1) {
      // Narrowed but still ambiguous → median-pick within the rarity subset.
      const pick = pickLikelyFrom(byRarity) ?? byRarity[0];
      return { printing: pick, value: priceOf(pick), autoPicked: true, matchQuality: 'auto', priceSpread };
    }
  }

  // 4. A single printing with no read code is unambiguous by construction.
  if (sets.length === 1 && !normalizeSetCode(setCode)) {
    return { printing: sets[0], value: priceOf(sets[0]), autoPicked: false, matchQuality: 'single', priceSpread };
  }

  // 5. Blind auto-pick (the documented median-price heuristic).
  const likely = pickLikelyPrinting(card);
  return { printing: likely, value: priceOf(likely), autoPicked: true, matchQuality: 'auto', priceSpread };
}

/** Extract the first card from a YGOPRODeck `{ data: [...] }` payload. */
export function firstCard(json: unknown): YgoCard | null {
  const data = (json as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(data) || !data.length) return null;
  const c = data[0] as YgoCard;
  return typeof c?.id === 'number' && typeof c?.name === 'string' ? c : null;
}
