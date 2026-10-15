/**
 * `.ydk` text I/O — the de-facto community decklist format, hand-rolled per
 * docs planned/yugioh-playtest/deck-model-and-storage §interchange-formats.
 * Sections `#main` / `#extra` / `!side` in order, ONE passcode per line per
 * copy (never `x3` shorthand). Tolerant parse: CRLF, blank lines and
 * `#comment` lines (the `#created by` convention) are fine; junk lines are
 * skipped and collected into `warnings` — import still succeeds.
 */
import type { DeckEntry } from './deck.js';

export interface ParsedYdk {
  main: DeckEntry[];
  extra: DeckEntry[];
  side: DeckEntry[];
  warnings: string[];
}

type Section = 'main' | 'extra' | 'side';

/** Aggregate an in-order passcode-per-copy list into DeckEntry[] preserving
 *  first-seen order (the canonical entry shape — one entry per passcode). */
function aggregate(passcodes: string[]): DeckEntry[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const p of passcodes) {
    if (!counts.has(p)) order.push(p);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return order.map((passcode) => ({ passcode, count: counts.get(passcode)! }));
}

/** Parse `.ydk` text. Never throws — unparseable lines land in `warnings`. */
export function parseYdk(text: string): ParsedYdk {
  const warnings: string[] = [];
  const raw: Record<Section, string[]> = { main: [], extra: [], side: [] };
  let section: Section | null = null;

  const lines = String(text ?? '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower === '#main') { section = 'main'; continue; }
    if (lower === '#extra') { section = 'extra'; continue; }
    if (lower === '!side') { section = 'side'; continue; }
    // Any other #comment (e.g. `#created by …`) is ignored wherever it appears.
    if (line.startsWith('#') || line.startsWith('!')) continue;
    // Lines before #main are ignored (header junk), silently.
    if (!section) continue;
    if (/^\d{1,10}$/.test(line)) {
      raw[section].push(line);
    } else {
      warnings.push(`line ${i + 1}: skipped unparseable "${line}"`);
    }
  }

  return {
    main: aggregate(raw.main),
    extra: aggregate(raw.extra),
    side: aggregate(raw.side),
    warnings,
  };
}

/** Serialize entries → `.ydk` text (canonical order, `#created by` header,
 *  one passcode per line per copy). */
export function serializeYdk(
  deck: { main: DeckEntry[]; extra: DeckEntry[]; side: DeckEntry[] },
  createdBy = 'yugioh.popcorn245.com',
): string {
  const expand = (entries: DeckEntry[]): string[] =>
    entries.flatMap((e) => Array<string>(Math.max(0, Math.floor(e.count))).fill(e.passcode));
  const out: string[] = [`#created by ${createdBy}`, '#main', ...expand(deck.main), '#extra', ...expand(deck.extra), '!side', ...expand(deck.side)];
  return out.join('\n') + '\n';
}
