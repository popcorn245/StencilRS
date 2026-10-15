/**
 * Card stacking — THE single implementation of the stack-identity rule (docs
 * bucket-bot/card-capture edge-cases §dedup), collapsing the copies that used
 * to live inline in bucket-bot's `addRecognizedCard` and
 * `finalizeScanPlaceholder` (and were mirrored by every reader that compared
 * printing/condition by hand).
 *
 * Stacking keys on EXACT `printingId` + `condition` + CONTAINER identity:
 *   • a different condition is a distinct row;
 *   • the same printing in a different container is a distinct row (a card
 *     scanned into deck A never silently merges into a stack in binder B);
 *   • splits are always explicit (never automatic).
 */
import { containerOf, itemMetadata, type CardItemLike } from './types.js';

/**
 * The stack identity key: `printingId` + `condition` (default 'NM') +
 * container identity ('' = loose in the collection). Two card rows belong to
 * the same stack iff their keys are equal.
 */
export function stackKey(printingId: string, condition: string | null | undefined, containerId: string | null | undefined): string {
  return `${printingId}|${String(condition ?? 'NM')}|${containerId ?? ''}`;
}

/** An item's stack key off its metadata + container, or null when it has no
 *  `printingId` (unresolved placeholder / manual unmatched add — never stacks). */
export function itemStackKey(item: CardItemLike): string | null {
  const m = itemMetadata(item);
  const printingId = String(m.printingId ?? '');
  if (!printingId) return null;
  return stackKey(printingId, String(m.condition ?? 'NM'), containerOf(item));
}

/** The stack a new/resolved card should merge into. */
export interface StackTarget {
  printingId: string;
  condition?: string | null;
  /** Capture-time destination container (null = loose in the collection). */
  containerId?: string | null;
}

/**
 * Find the existing stack `target` belongs to, or undefined (→ distinct row).
 * `excludeId` skips the row being resolved itself (merge-on-resolve must not
 * match the placeholder it is finalizing).
 */
export function findStackMatch<T extends CardItemLike>(
  cards: T[],
  target: StackTarget,
  opts: { excludeId?: string } = {},
): T | undefined {
  const printingId = String(target.printingId ?? '');
  if (!printingId) return undefined;
  const key = stackKey(printingId, target.condition, target.containerId ?? null);
  return cards.find((c) => (opts.excludeId == null || c.id !== opts.excludeId) && itemStackKey(c) === key);
}
