/**
 * Shared types + defensive helpers for the Thread Model v2 card renderers
 * (`pop-thread-card-timer`, `-task`, `-list`, `-showtimes`).
 *
 * These renderers are pure props-in / events-out presentation components: they
 * never fetch, never touch Firebase, and must NEVER throw. A single malformed
 * card payload must degrade to a one-line fallback rather than blank the whole
 * timeline it is rendered into.
 */

/** A person a card is assigned to. Renderers show `displayName`, never `uid`. */
export interface CardAssignee {
  uid: string;
  displayName: string;
  photoURL?: string;
}

/** The validated card payload every renderer receives. */
export interface CardPayload {
  title: string;
  subtitle?: string;
  refs?: Record<string, string[]>;
  data: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  assignees?: CardAssignee[];
}

/**
 * A button a renderer offers.
 *
 * `mutating: true` actions write something back (complete, snooze, check…) and
 * are hidden when the card is frozen or the view is readonly. Navigational
 * actions (`mutating: false`) only move the user somewhere and survive a freeze.
 */
export interface CardAction {
  actionId: string;
  label: string;
  icon: string;
  mutating: boolean;
  params?: Record<string, unknown>;
}

/** Live cards are interactive; frozen cards are a historical snapshot. */
export type CardLiveness = 'live' | 'frozen';

/** Detail shape of the `popCardAction` event emitted by every renderer. */
export interface CardActionDetail {
  actionId: string;
  params?: Record<string, unknown>;
}

/** Text shown when a payload is too broken to render anything meaningful. */
export const CARD_FALLBACK_TEXT = "couldn't render this card";

/** Normalized, always-safe view of an unknown payload. */
export interface SafeCard {
  /** False when the payload is missing/garbage → render the fallback only. */
  ok: boolean;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
  assignees: CardAssignee[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Coerce an unknown payload into something a render() can walk without
 * optional-chaining every line. Never throws.
 */
export function readCard(payload: unknown): SafeCard {
  const empty: SafeCard = { ok: false, title: '', subtitle: '', data: {}, assignees: [] };
  if (!isRecord(payload)) return empty;

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const subtitle = typeof payload.subtitle === 'string' ? payload.subtitle.trim() : '';
  const data = isRecord(payload.data) ? payload.data : {};
  const assignees = readAssignees(payload.assignees);

  // A card is renderable if it has *something* to show: a title or some data.
  const ok = title.length > 0 || Object.keys(data).length > 0;
  return { ok, title, subtitle, data, assignees };
}

/** Assignees, filtered to entries that can be shown by NAME. Never throws. */
export function readAssignees(input: unknown): CardAssignee[] {
  if (!Array.isArray(input)) return [];
  const out: CardAssignee[] = [];
  for (const raw of input) {
    if (!isRecord(raw)) continue;
    const uid = typeof raw.uid === 'string' ? raw.uid : '';
    const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
    if (!displayName) continue; // never fall back to a raw uid
    out.push({
      uid,
      displayName,
      photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : undefined,
    });
  }
  return out;
}

/** Which actions survive the current liveness/readonly combination. */
export function visibleActions(
  actions: CardAction[],
  liveness: CardLiveness,
  readonly: boolean,
): CardAction[] {
  if (readonly) return [];
  if (liveness === 'frozen') return actions.filter((a) => !a.mutating);
  return actions;
}

/** "1h 30m" / "25m" / "45s" — compact human duration. Never throws. */
export function formatDuration(ms: unknown): string {
  const n = typeof ms === 'number' && Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const total = Math.floor(n / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
