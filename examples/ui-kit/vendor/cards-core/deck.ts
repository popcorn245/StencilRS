/**
 * Constructed-decklist domain — types + validation (docs
 * planned/yugioh-playtest/deck-model-and-storage). Framework-free: entries
 * key on the 8-digit passcode and a count, nothing else is ever persisted
 * (the gameplay-data-not-persisted rule, P2).
 *
 * Deck-part modeling ideas ported from RillingDev/yugioh-deck-tool
 * (Apache-2.0) — logic only, no code from its Vue layers. Validation
 * semantics follow DawnbrandBots/ydeck as a SPECIFICATION only (its code is
 * GPL-family and is never imported or ported).
 */

/** One decklist entry — keyed on the 8-digit passcode. count 1–3. */
export interface DeckEntry {
  passcode: string; // String(ygoprodeckId) — same convention as metadata.passcode
  count: number; // 1 | 2 | 3 (banlist may cap lower at VALIDATION time, not storage)
}

/** Firestore `decks/{deckId}` — id is a nanoid(12), doc id == field `id`.
 *  createdAt/updatedAt are Firestore server timestamps; cards-core is
 *  framework-free so they stay opaque here (consumers project them). */
export interface DeckDoc {
  id: string;
  ownerId: string; // Firebase uid — the rules key
  name: string;
  main: DeckEntry[]; // target 40–60 total counts (soft at storage time)
  extra: DeckEntry[]; // 0–15
  side: DeckEntry[]; // 0–15
  createdAt?: unknown; // serverTimestamp()
  updatedAt?: unknown; // serverTimestamp() on every write
}

export type DeckPart = 'main' | 'extra' | 'side';

/** The card facts validation needs — the shape of a `card_db` row lookup.
 *  Return null for a passcode the local dump doesn't know. */
export interface DeckCardInfo {
  name?: string;
  type?: string; // 'Effect Monster' | 'Token' | 'Skill Card' | …
  frameType?: string; // extra-deck membership derives from this
  /** `banlist_info.ban_tcg` from the dump (TCG Advanced — the only v1 format). */
  banTcg?: string | null;
}

export type DeckCardLookup = (passcode: string) => DeckCardInfo | null | undefined;

export type DeckViolationCode =
  | 'main_too_small'
  | 'main_too_large'
  | 'extra_too_large'
  | 'side_too_large'
  | 'too_many_copies'
  | 'banlist_violation'
  | 'wrong_deck_part'
  | 'unknown_card'
  | 'illegal_card_type';

export interface DeckViolation {
  code: DeckViolationCode;
  /** 'error' blocks legality; 'warning' renders but never blocks (unknown_card). */
  severity: 'error' | 'warning';
  message: string;
  /** The offending passcode where the rule is per-card. */
  passcode?: string;
  /** Resolved card name when the lookup knows it. */
  cardName?: string;
  /** Banlist status for banlist_violation (the red pill's label). */
  banStatus?: string;
  part?: DeckPart;
}

export interface DeckValidation {
  /** No error-severity violations (warnings — unknown_card — don't block). */
  legal: boolean;
  violations: DeckViolation[];
  counts: { main: number; extra: number; side: number };
}

export const MAIN_MIN = 40;
export const MAIN_MAX = 60;
export const EXTRA_MAX = 15;
export const SIDE_MAX = 15;
export const COPY_CAP = 3;

/** Extra-deck frame types — pendulum fusions/synchros/xyz are still Extra. */
const EXTRA_FRAMES = new Set([
  'fusion', 'synchro', 'xyz', 'link',
  'fusion_pendulum', 'synchro_pendulum', 'xyz_pendulum',
]);

/** Whether a `frameType` belongs in the Extra Deck. */
export function isExtraDeckFrame(frameType: string | null | undefined): boolean {
  return EXTRA_FRAMES.has(String(frameType ?? '').toLowerCase());
}

/** Card types that are never legal deck cards. */
const ILLEGAL_TYPES = new Set(['token', 'skill card']);

/** Σ count over a deck part. */
export function deckPartSize(entries: DeckEntry[]): number {
  return entries.reduce((sum, e) => sum + (Number.isFinite(e.count) ? e.count : 0), 0);
}

/** Banlist copy cap per `banTcg` status (TCG Advanced). Null = unlimited (3).
 *  The LIVE cardinfo.php dump says `"Forbidden"` where older docs said
 *  `"Banned"` — accept both (verified against the deployed card_db). */
export function banlistCap(banTcg: string | null | undefined): number {
  switch (String(banTcg ?? '').toLowerCase()) {
    case 'banned':
    case 'forbidden': return 0;
    case 'limited': return 1;
    case 'semi-limited': return 2;
    default: return COPY_CAP;
  }
}

/**
 * Validate a deck against the TCG Advanced construction rules (sizes, the
 * 3-copy cap across main+extra+side, banlist caps, extra-frame placement,
 * card sanity). Returns a structured list, never throws. `unknown_card` is a
 * WARNING — an imported deck referencing a card newer than the local dump
 * must still save and render (deck-model-and-storage §validation-rules).
 */
export function validateDeck(
  deck: Pick<DeckDoc, 'main' | 'extra' | 'side'>,
  lookup: DeckCardLookup,
): DeckValidation {
  const violations: DeckViolation[] = [];
  const counts = {
    main: deckPartSize(deck.main),
    extra: deckPartSize(deck.extra),
    side: deckPartSize(deck.side),
  };

  if (counts.main < MAIN_MIN) {
    violations.push({ code: 'main_too_small', severity: 'error', part: 'main', message: `Main Deck has ${counts.main} cards (minimum ${MAIN_MIN})` });
  } else if (counts.main > MAIN_MAX) {
    violations.push({ code: 'main_too_large', severity: 'error', part: 'main', message: `Main Deck has ${counts.main} cards (maximum ${MAIN_MAX})` });
  }
  if (counts.extra > EXTRA_MAX) {
    violations.push({ code: 'extra_too_large', severity: 'error', part: 'extra', message: `Extra Deck has ${counts.extra} cards (maximum ${EXTRA_MAX})` });
  }
  if (counts.side > SIDE_MAX) {
    violations.push({ code: 'side_too_large', severity: 'error', part: 'side', message: `Side Deck has ${counts.side} cards (maximum ${SIDE_MAX})` });
  }

  // Per-passcode totals across ALL parts (copy cap + banlist), preserving
  // first-seen order for stable violation output.
  const totals = new Map<string, number>();
  const partOf = new Map<string, DeckPart>();
  const parts: [DeckPart, DeckEntry[]][] = [['main', deck.main], ['extra', deck.extra], ['side', deck.side]];
  for (const [part, entries] of parts) {
    for (const e of entries) {
      totals.set(e.passcode, (totals.get(e.passcode) ?? 0) + e.count);
      if (!partOf.has(e.passcode)) partOf.set(e.passcode, part);
    }
  }

  for (const [passcode, total] of totals) {
    const info = lookup(passcode) ?? null;
    const cardName = info?.name;
    const label = cardName ?? `#${passcode}`;

    if (!info) {
      violations.push({ code: 'unknown_card', severity: 'warning', passcode, message: `Unknown card #${passcode} (not in the local card DB)` });
      // No further checks possible without card facts.
      if (total > COPY_CAP) {
        violations.push({ code: 'too_many_copies', severity: 'error', passcode, message: `${label}: ${total} copies (maximum ${COPY_CAP})` });
      }
      continue;
    }

    if (ILLEGAL_TYPES.has(String(info.type ?? '').toLowerCase())) {
      violations.push({ code: 'illegal_card_type', severity: 'error', passcode, cardName, message: `${label} is a ${info.type} — not a legal deck card` });
    }

    if (total > COPY_CAP) {
      violations.push({ code: 'too_many_copies', severity: 'error', passcode, cardName, message: `${label}: ${total} copies (maximum ${COPY_CAP})` });
    }

    const cap = banlistCap(info.banTcg);
    if (cap < COPY_CAP && total > cap) {
      const status = String(info.banTcg);
      violations.push({
        code: 'banlist_violation', severity: 'error', passcode, cardName, banStatus: status,
        message: `${label} is ${status} (maximum ${cap}) — ${total} in deck`,
      });
    }
  }

  // Placement: extra frames only in extra; non-extra frames never in extra.
  for (const [part, entries] of parts) {
    for (const e of entries) {
      const info = lookup(e.passcode) ?? null;
      if (!info?.frameType) continue;
      const isExtra = isExtraDeckFrame(info.frameType);
      if (isExtra && part !== 'extra') {
        violations.push({ code: 'wrong_deck_part', severity: 'error', passcode: e.passcode, cardName: info.name, part, message: `${info.name ?? `#${e.passcode}`} is an Extra Deck card (${info.frameType}) — it can't go in the ${part} deck` });
      } else if (!isExtra && part === 'extra') {
        violations.push({ code: 'wrong_deck_part', severity: 'error', passcode: e.passcode, cardName: info.name, part, message: `${info.name ?? `#${e.passcode}`} (${info.frameType}) is not an Extra Deck card` });
      }
    }
  }

  return {
    legal: violations.every((v) => v.severity !== 'error'),
    violations,
    counts,
  };
}
