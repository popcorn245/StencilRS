import type { CardAction, CardLiveness, CardPayload } from '../../molecules/thread-card/thread-card-types';

export type { CardAction, CardLiveness, CardPayload };

/** Who put the item in the thread. Drives attribution and bubble styling. */
export type ThreadItemAuthorKind = 'human' | 'bot' | 'system' | 'panel';

/** Check-off state of an item. `dismissed` items render collapsed. */
export type ThreadItemStatus = 'open' | 'done' | 'dismissed';

/**
 * One row of a Thread Model v2 timeline.
 *
 * The SERVER decides the order; `pop-thread-timeline` renders `items` exactly as
 * given and never re-sorts them. `createdAt` is epoch ms and is used for display
 * only.
 */
export interface ThreadItem {
  id: string;
  threadId: string;
  kind: 'message' | 'card';
  /** Null for system/bot-authored rows that have no human behind them. */
  authorUid: string | null;
  authorKind: ThreadItemAuthorKind;
  text?: string | null;
  cardType?: string | null;
  card?: CardPayload | null;
  liveness?: CardLiveness | null;
  itemStatus?: ThreadItemStatus | null;
  /** Renders a tappable back-reference stub that scrolls to the referenced item. */
  replyToItemId?: string | null;
  /** Panel that posted the item (`grocery`, `fit`, …) — shown as attribution. */
  sourcePanel?: string | null;
  assignedToUids?: string[];
  createdAt: number;
  /** Card actions offered for this item, before liveness/readonly filtering. */
  actions?: CardAction[];
  /** Resolved `pop-*` renderer tag; normally filled in from the `renderers` map. */
  renderer?: string | null;
  /** True when the item offers a check-off affordance. */
  checkable?: boolean;
}

/** Detail of `popItemAction` — a card action fired from inside an item. */
export interface ThreadItemActionDetail {
  itemId: string;
  actionId: string;
  params?: Record<string, unknown>;
}

/** Detail of `popItemStatus` — a check-off. */
export interface ThreadItemStatusDetail {
  itemId: string;
  status: ThreadItemStatus;
}

/** Detail of `popItemReply` / `popItemPromote`. */
export interface ThreadItemRefDetail {
  itemId: string;
}

/** Detail of `popLoadOlder` — cursor is the id of the OLDEST rendered item. */
export interface ThreadLoadOlderDetail {
  cursor: string | null;
}
