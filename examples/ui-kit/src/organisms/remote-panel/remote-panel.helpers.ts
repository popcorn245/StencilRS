/**
 * Remote-panel helpers — pure, unit-testable, self-contained.
 *
 * Types + presentation logic COPIED (never imported) from bucket-hub's
 * `api/types.ts` and `state/remote.ts`, so ui-kit stays dependency-free. The host
 * (the Bucket Hub) owns network, optimistic mutations and the PanelShell chrome;
 * this organism just renders the data it is handed and emits `pop*` events.
 */

/** The Harmony "Power Off" activity id (mirrors ACTIVITY_IDS.off on the server). */
export const ACTIVITY_OFF_ID = '-1';

/** Default calibrate (receiver volume) bounds — mirror the hub's REMOTE_CALIBRATE_*. */
export const REMOTE_CALIBRATE_MIN = 0;
export const REMOTE_CALIBRATE_MAX = 60;

/** One Harmony activity (Watch TV / Switch / Music / Power Off). */
export interface RemoteActivity {
  id: string;
  label: string;
  receiverInput?: string;
}

/** The current AV snapshot: active activity + the tracked receiver volume level. */
export interface RemoteCurrent {
  activityId?: string;
  activityLabel?: string;
  level: number;
  known: boolean;
}

/** One device within a structured room group (matches the bot's RoomDevice). */
export interface RemoteRoomDevice {
  /** Friendly label (never leaks an IP). */
  label: string;
  /** Simplified state: 'playing' | 'paused' | 'off'. */
  state: 'playing' | 'paused' | 'off';
  /** Friendly app/source name when on (e.g. "Plex"), else undefined. */
  app?: string;
  /** Now-playing title when known (Plex session). The panel status ignores this. */
  nowPlaying?: string;
  /** True for the synthetic Harmony Receiver (renders an input, not an app). */
  receiver?: boolean;
  /** The receiver's selected INPUT source (e.g. "SAT/CATV"), receiver-only. */
  input?: string;
}

/** One /av room (the switcher tab / header text). */
export interface RemoteRoom {
  /** Canonical area name. */
  area: string;
  /** Configured emoji for the area, or '' when none. */
  emoji: string;
  /** True for the PRIMARY area (the Harmony room → full remote controls). */
  primary: boolean;
  devices: RemoteRoomDevice[];
}

/** The transport actions the playback row can fire (`toggle` = play/pause). */
export type TransportAction =
  | 'play'
  | 'pause'
  | 'toggle'
  | 'stop'
  | 'next'
  | 'previous'
  | 'forward'
  | 'rewind';

/** The derived playback state that drives the emphasized play/pause button.
 *  'unknown' when the host can't derive it (no primary-room device state). */
export type PlayState = 'playing' | 'paused' | 'stopped' | 'unknown';

/** One curated streaming-app launcher tile. */
export interface RemoteApp {
  key: string;
  label: string;
  /** Brand hue that FILLS the tile chip. */
  accent: string;
  /** Letter fallback mark when there's no `logo` asset. */
  glyph: string;
  /** Asset slug served at `${appAssetBase}/<logo>.svg`; absent → letter chip. */
  logo?: string;
}

/**
 * Pick a clear ionicon for an activity from its label (best-effort keyword match)
 * with a sensible default. Power Off always gets the power icon.
 */
export function activityIcon(a: RemoteActivity): string {
  if (a.id === ACTIVITY_OFF_ID) return 'power-outline';
  const l = (a.label || '').toLowerCase();
  if (/(music|audio|spotify|sonos|listen|sound)/.test(l)) return 'musical-notes-outline';
  if (/(game|switch|nintendo|xbox|playstation|ps5|ps4)/.test(l)) return 'game-controller-outline';
  if (/(shield|tv|watch|movie|film|plex|netflix|stream|cable|sat)/.test(l)) return 'tv-outline';
  if (/(roku|apple ?tv|chromecast|cast)/.test(l)) return 'tv-outline';
  if (/(dvd|blu|disc)/.test(l)) return 'disc-outline';
  return 'tv-outline';
}

/** The playback transport row — 5 buttons; the center `toggle` is emphasized and
 *  its glyph is state-aware (▶ vs ⏸), matching the approved mockup. */
export const TRANSPORT_BUTTONS: { action: TransportAction; icon: string; label: string; primary?: boolean }[] = [
  { action: 'rewind', icon: 'play-back-outline', label: 'Rewind' },
  { action: 'previous', icon: 'play-skip-back-outline', label: 'Previous' },
  { action: 'toggle', icon: 'pause-outline', label: 'Play / Pause', primary: true },
  { action: 'next', icon: 'play-skip-forward-outline', label: 'Next' },
  { action: 'forward', icon: 'play-forward-outline', label: 'Fast-forward' },
];

/** The curated app-launcher grid — mirrors the server's HUB_APPS allow-list. */
export const REMOTE_APPS: RemoteApp[] = [
  { key: 'netflix', label: 'Netflix', accent: '#e50914', glyph: 'N', logo: 'netflix' },
  { key: 'disney', label: 'Disney+', accent: '#1a4bce', glyph: 'D' },
  { key: 'hulu', label: 'Hulu', accent: '#1ce783', glyph: 'H', logo: 'hulu' },
  { key: 'youtube', label: 'YouTube', accent: '#ff0033', glyph: 'Y', logo: 'youtube' },
  { key: 'prime', label: 'Prime Video', accent: '#00a8e1', glyph: 'P', logo: 'prime' },
  { key: 'appletv', label: 'Apple TV', accent: '#6e6e73', glyph: 'A', logo: 'appletv' },
  { key: 'plex', label: 'Plex', accent: '#e5a00d', glyph: 'P', logo: 'plex' },
  { key: 'crunchyroll', label: 'Crunchyroll', accent: '#f47521', glyph: 'C', logo: 'crunchyroll' },
];

/** The center play/pause glyph for a given transport state. */
export function playToggleIcon(state: PlayState): string {
  return state === 'playing' ? 'pause' : 'play';
}

/** Clamp + round a raw volume level into [0, max]. */
export function clampLevel(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

/** Parse + clamp a numeric string to [min,max] (inclusive). Returns the clamped
 *  NUMBER, or null when the input isn't finite (so the user can keep typing). */
export function clampNumber(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}
