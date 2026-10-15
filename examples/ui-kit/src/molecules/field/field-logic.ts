/**
 * Pure logic for pop-field's composite widgets — number clamping and the
 * depth / persist composites (moved out of bucket-hub's inline renderers).
 * No Stencil imports; unit-tested directly.
 */

// ── field spec ───────────────────────────────────────────────────────────────

/**
 * The field spec a pop-field renders. Generalizes bucket-hub's `HubVariable`
 * (the host translates its own variable shape into this).
 */
export interface FieldSpec {
  key: string;
  label: string;
  /** Known types render natively; anything else falls back to the default slot
   *  (the app supplies the widget) while pop-field keeps the label/hint/required
   *  chrome and re-emits the slotted widget's `valueChange` as its own. */
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'location' | 'depth' | 'persist' | string;
  hint?: string;
  required?: boolean;
  /** Explicitly optional (e.g. an optional flag-emitting variable): a `select`
   *  with no `defaultValue` gets a "—" unset placeholder so "unset" renders as
   *  unset instead of implying the first option was chosen. */
  optional?: boolean;
  /** select options. */
  options?: { value: string; label: string }[];
  /** number bounds (inclusive) + step. */
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Soft default: `location` uses it as pop-location's fallback; a `select`
   *  with a default skips the "—" unset placeholder. */
  defaultValue?: string;
}

// ── number clamp ─────────────────────────────────────────────────────────────

/**
 * Parse + clamp a numeric string to [min,max] (inclusive). Returns the clamped
 * NUMBER, or null when the input isn't a finite number (leave the raw text
 * alone so the user can keep typing "-", "1.", …). Client-side so the UI shows
 * the bound immediately instead of relying on silent server clamping.
 */
export function clampNumber(raw: string, min?: number, max?: number): number | null {
  if (raw.trim() === '') return null; // empty isn't a number (Number('') === 0)
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  let v = n;
  if (min != null && v < min) v = min;
  if (max != null && v > max) v = max;
  return v;
}

// ── depth composite (research Quick/Standard/Deep/Custom slider) ─────────────

/** The depth slider's ordered stops. The first three are `--depth` presets; the
 *  4th, 'custom', emits NO depth and instead drives `maxSources`. */
export const DEPTH_STOPS = ['quick', 'standard', 'deep', 'custom'] as const;
export type DepthStop = (typeof DEPTH_STOPS)[number];

/** Approx sources each preset reads (shown in the slider's read-only count box;
 *  mirrors the orchestrator's depth targets — quick≈3, standard≈5, deep≈10). */
export const DEPTH_PRESET_SOURCES: Record<'quick' | 'standard' | 'deep', number> = {
  quick: 3,
  standard: 5,
  deep: 10,
};

/** The composite value a `pop-field type="depth"` reads and emits. */
export interface DepthValue {
  /** '' in custom mode (so the host emits no --depth flag). */
  depth: string;
  /** '' in preset mode; the custom source count otherwise (→ --max-sources). */
  maxSources: string;
}

/** Derive the slider stop from the composite value: a set `maxSources` means
 *  Custom mode; otherwise whichever preset is selected (default standard). */
export function depthStopFromValues(depth: string | undefined, maxSources: string | undefined): DepthStop {
  if (maxSources !== undefined && maxSources !== '') return 'custom';
  const d = (depth || 'standard') as DepthStop;
  return DEPTH_STOPS.includes(d) && d !== 'custom' ? d : 'standard';
}

/** The `{depth, maxSources}` patch for a chosen slider stop:
 *  preset → set `depth`, CLEAR `maxSources`; custom → clear `depth`, set
 *  `maxSources` to `customCount`. */
export function depthValuesForStop(stop: DepthStop, customCount: number): DepthValue {
  if (stop === 'custom') return { depth: '', maxSources: String(customCount) };
  return { depth: stop, maxSources: '' };
}

/** Clamp a custom source count to the orchestrator's hard cap (1–10). */
export function clampCustomSources(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/** Normalize a pop-field depth `value` (object, legacy string, or unset). */
export function normalizeDepthValue(value: unknown): DepthValue {
  if (value && typeof value === 'object') {
    const v = value as Partial<DepthValue>;
    return { depth: v.depth ?? '', maxSources: v.maxSources ?? '' };
  }
  if (typeof value === 'string') return { depth: value, maxSources: '' };
  return { depth: '', maxSources: '' };
}

// ── persist composite (note / knowledge-base checkboxes) ─────────────────────

/** The note/index checkbox pair ⇄ the single persist value. */
export function persistToggles(persist: string | undefined): { note: boolean; index: boolean } {
  return {
    note: persist === 'note' || persist === 'both',
    index: persist === 'index' || persist === 'both',
  };
}

/** Combine the two checkboxes into one persist value. Neither → 'none' (the
 *  default, so nothing is emitted); both → 'both'. */
export function persistFromToggles(note: boolean, index: boolean): 'none' | 'note' | 'index' | 'both' {
  if (note && index) return 'both';
  if (note) return 'note';
  if (index) return 'index';
  return 'none';
}

// ── misc ─────────────────────────────────────────────────────────────────────

/** Loose boolean parse for form values ('true'/'1'/'yes'/'on' → true). */
export function isTruthyValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string' || !value) return false;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}
