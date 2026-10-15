/**
 * Pure helpers + view types for pop-reminders-panel. No StencilJS / DOM imports
 * so they unit-test in isolation and keep the organism thin. Mirrors the shapes
 * the Bucket Hub's HubReminderItem / AlarmSettings carry, but re-declared here so
 * ui-kit stays free of any app-package dependency.
 */

/** One reminder row (structurally the hub's HubReminderItem). */
export interface ReminderRow {
  id: string;
  title: string;
  /** Fire instant as ISO, or null. */
  reminderAt: string | null;
  /** ms until fire relative to the fetch baseline (negative = overdue), or null. */
  fireInMs: number | null;
  recurring: boolean;
  overdue: boolean;
  status: string;
}

/** Inline segmented-filter counts (host-computed, best-effort). */
export interface ReminderFilterCounts {
  upcoming: number;
  today: number;
  overdue: number;
  recurring: number;
}

/** Alarm settings the drawer edits (host owns persistence). */
export interface AlarmSettingsView {
  sound: string;
  /** 0..1 */
  volume: number;
  soundOn: boolean;
  vibrateOn: boolean;
  pushOn: boolean;
}

/** A selectable alarm-tone option. */
export interface AlarmSoundOption {
  id: string;
  label: string;
}

/** The segmented filter definitions (id + label), in display order. */
export const REMINDER_FILTERS: { id: string; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'recurring', label: 'Recurring' },
];

/** Snooze durations (minutes) offered by the per-row snooze menu. */
export const SNOOZE_CHOICES = [5, 10, 30, 60];

export const DEFAULT_ALARM_SOUNDS: AlarmSoundOption[] = [
  { id: 'chime', label: 'Chime' },
  { id: 'bell', label: 'Bell' },
  { id: 'digital', label: 'Digital' },
  { id: 'radar', label: 'Radar' },
];

export const DEFAULT_ALARM_SETTINGS: AlarmSettingsView = {
  sound: 'chime',
  volume: 0.7,
  soundOn: true,
  vibrateOn: true,
  pushOn: true,
};

const HOUR_MS = 3_600_000;

/** ISO → the value a <input type="datetime-local"> wants (local wall time). */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Short absolute fire label, local time ("Thu 7/9 5:00 PM" / "Today 5:00 PM"). */
export function formatWhen(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'no time';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  const day = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
  return `${day} ${time}`;
}

/** Minute-level relative label for rows ("in 2h 5m" / "12m overdue" / "ringing now"). */
export function relativeShort(deadlineMs: number, now: number = Date.now()): string {
  const diff = deadlineMs - now;
  const overdue = diff < 0;
  if (Math.abs(diff) < 30_000) return 'ringing now';
  const totalMin = Math.max(1, Math.round(Math.abs(diff) / 60_000));
  const d = Math.floor(totalMin / 1440);
  const hh = Math.floor((totalMin % 1440) / 60);
  const mm = totalMin % 60;
  const span = d > 0 ? `${d}d${hh ? ` ${hh}h` : ''}` : hh > 0 ? `${hh}h${mm ? ` ${mm}m` : ''}` : `${mm}m`;
  return overdue ? `${span} overdue` : `in ${span}`;
}

/**
 * The hero countdown text: a live "M:SS" within the final hour (so the seconds
 * visibly tick down + match the drain), a coarse "2h 5m" / "1d 3h" beyond, and
 * "now" at/just past zero. Mirrors the mockup ("14:32" / "0:47").
 */
export function heroCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'now';
  if (remainingMs < HOUR_MS) {
    const total = Math.floor(remainingMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  const totalMin = Math.round(remainingMs / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Remaining fraction (0..100) of the set→fire window for the shared drain bar:
 * the fill recedes right→left as time is spent. `totalMs` is the ORIGINAL
 * window (reminderAt − createdAt); a missing/invalid window falls back to
 * `remainingMs` so the bar reads full (100). Never > 100 / < 0.
 */
export function drainPct(remainingMs: number, totalMs: number | undefined): number {
  const total = totalMs && totalMs > 0 ? Math.max(totalMs, remainingMs) : Math.max(remainingMs, 1);
  return Math.min(100, Math.max(0, (remainingMs / total) * 100));
}

/** Whether the soonest reminder is imminent enough (≤ 60s) to go red/urgent. */
export function isImminent(remainingMs: number): boolean {
  return remainingMs <= 60_000;
}

/** The final-hour window where a live per-second tick matters (else a static bar). */
export const HERO_TICK_WINDOW_MS = HOUR_MS;
