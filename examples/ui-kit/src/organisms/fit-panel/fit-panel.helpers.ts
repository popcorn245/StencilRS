/**
 * Pure types + helpers for pop-fit-panel. Deliberately self-contained — the
 * organism must NOT import from bucket-hub, so the data shapes it consumes are
 * copied here (the host maps its own `HubFitState` onto these). No Stencil
 * imports; unit-tested directly.
 */
import type { ChartSeries } from '../../molecules/line-chart/chart-scale';
import type { ChartRefLine, ChartRangeBand } from '../../molecules/line-chart/line-chart';
import type { FieldSpec } from '../../molecules/field/field-logic';

// ── data shapes (mirrors bucket-hub's fit types) ─────────────────────────────
export interface FitPoint {
  t: number;
  v: number;
}
export interface FitGlucosePoint extends FitPoint {
  context: string;
  verdict: 'below' | 'in_range' | 'above' | 'no_goal';
}
export interface FitDayBar {
  /** YYYY-MM-DD (local). */
  day: string;
  v: number;
}
export interface FitLatest {
  weightLbs: number | null;
  weightAt: number | null;
  bodyFatPct: number | null;
  bmi: number | null;
  glucose: number | null;
  glucoseAt: number | null;
  glucoseContext: string | null;
  caloriesToday: number;
  workoutsInWindow: number;
}
export interface FitGoals {
  glucoseMin: number | null;
  glucoseMax: number | null;
  goalWeightLbs: number | null;
  dailyCalorieGoal: number | null;
  dailyStepGoal?: number | null;
  heightIn?: number | null;
  glucoseBandSource?: 'personal' | 'derived' | null;
}
export interface FitDayGlucose {
  id: string;
  value: number;
  context: string;
  takenAt: number;
  note: string | null;
}
export interface FitDayBody {
  id: string;
  weightLbs: number | null;
  bodyFatPct: number | null;
  takenAt: number;
}
export interface FitDayFood {
  id: string;
  description: string;
  calories: number | null;
  mealType: string;
  loggedAt: number;
}
export interface FitDayWorkout {
  id: string;
  type: string;
  durationMin: number | null;
  distance: number | null;
  performedAt: number;
}
export interface FitDayReadings {
  glucose: FitDayGlucose[];
  body: FitDayBody[];
  food: FitDayFood[];
  workouts: FitDayWorkout[];
}
export type FitReadingDomain = 'glucose' | 'body' | 'food' | 'workout';

/** The six Fit metric cards. */
export type FitCardKey = 'weight' | 'bodyfat' | 'bmi' | 'bg' | 'calories' | 'workout';

/** A rendered metric-card definition (glyph + label + value + sub). */
export interface FitPanelCard {
  key: string;
  glyph: string;
  label: string;
  value: string;
  sub: string;
  /** Whether the card doubles as a log entry point (default true). */
  loggable?: boolean;
}

/** The payload emitted on `popLog` — the host maps card + values → its API. */
export interface FitLogPayload {
  card: string;
  values: Record<string, string>;
  /** Recorded-at epoch (ms): now for today, else noon of the selected day. */
  at: number;
}

// ── chart colors ─────────────────────────────────────────────────────────────
const C_WEIGHT = '#3b82f6';
const C_GLUCOSE = '#e53e3e';
const C_CAL = '#3b82f6';
const C_GOAL = '#d9820b';
const C_BAND = '#3b82f6';

// ── blood-glucose context tags (mirror the backend's normalized values) ──────
export const BG_CONTEXTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'fasting', label: 'Fasting' },
  { value: 'pre_meal', label: 'Before meal' },
  { value: 'post_meal', label: 'After meal' },
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'random', label: 'Random' },
];

// ── day helpers (local, timezone-explicit) ───────────────────────────────────
export function localTodayStr(t: number = Date.now()): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isTodayStr(day: string): boolean {
  return day === localTodayStr();
}

/** Noon-local epoch of a day — the backfill event time for a past-day log. */
export function dayNoon(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).getTime();
}

/** The recorded-at a log on `day` should carry: now for today, else noon. */
export function logAtFor(day: string): number {
  return isTodayStr(day) ? Date.now() : dayNoon(day);
}

/** Short "Jul 3" label for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Compact MM/DD/YY for the header pill. */
export function shortDay(day: string): string {
  const [y, m, d] = day.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

export function fmtDay(t: number): string {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** A neutral, informational BMI category word (NOT a diagnosis). */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

/**
 * The six metric cards, day-aware: today keeps live labels ("Calories today"),
 * a past day reflects the date. Off `latest` + `goals`. `windowDays` sizes the
 * workouts sub-line (default 30).
 */
export function fitCards(latest: FitLatest, goals: FitGoals, day: string, windowDays = 30): FitPanelCard[] {
  const l = latest;
  const g = goals;
  const today = isTodayStr(day);
  const lbl = dayLabel(day);
  return [
    {
      key: 'weight',
      glyph: '⚖️',
      label: 'Weight',
      value: l.weightLbs !== null ? `${l.weightLbs} lbs` : '—',
      sub: l.weightAt ? fmtDay(l.weightAt) : today ? '' : lbl,
    },
    {
      key: 'bodyfat',
      glyph: '🔥',
      label: 'Body fat',
      value: l.bodyFatPct !== null ? `${l.bodyFatPct}%` : '—',
      sub: l.weightAt ? fmtDay(l.weightAt) : today ? '' : lbl,
    },
    {
      key: 'bmi',
      glyph: '📊',
      label: 'BMI',
      value: l.bmi !== null ? `${l.bmi}` : '—',
      sub: l.bmi !== null ? bmiCategory(l.bmi) : '',
    },
    {
      key: 'bg',
      glyph: '🩸',
      label: 'Blood sugar',
      value: l.glucose !== null ? `${l.glucose}` : '—',
      sub: l.glucose !== null ? `mg/dL · ${(l.glucoseContext || 'random').replace('_', '-')}` : '',
    },
    {
      key: 'calories',
      glyph: '🍎',
      label: today ? 'Calories today' : 'Calories',
      value: `${l.caloriesToday || 0}`,
      sub: g.dailyCalorieGoal ? `of ${g.dailyCalorieGoal} goal` : today ? 'kcal' : lbl,
    },
    {
      key: 'workout',
      glyph: '🏃',
      label: 'Workouts',
      value: `${l.workoutsInWindow}`,
      sub: today ? `last ${windowDays}d` : lbl,
    },
  ];
}

// ── pop-field form specs per card ────────────────────────────────────────────
/** The pop-field(s) for a card's add form. First field is required. */
export function fitFormFields(card: string): FieldSpec[] {
  switch (card) {
    case 'weight':
      return [{ key: 'weightLbs', label: 'Weight (lbs)', type: 'number', placeholder: 'e.g. 184', required: true }];
    case 'bodyfat':
      return [{ key: 'bodyFatPct', label: 'Body fat (%)', type: 'number', placeholder: 'e.g. 22', required: true }];
    case 'bmi':
      return [
        { key: 'heightFt', label: 'Height (ft)', type: 'number', placeholder: '5', required: true },
        { key: 'heightIn', label: 'Height (in)', type: 'number', placeholder: '9' },
      ];
    case 'bg':
      return [
        { key: 'value', label: 'Glucose (mg/dL)', type: 'number', placeholder: 'e.g. 112', required: true },
        { key: 'context', label: 'Context', type: 'select', options: BG_CONTEXTS.map((o) => ({ ...o })), defaultValue: 'random' },
      ];
    case 'calories':
      return [
        { key: 'description', label: 'Food / meal', type: 'text', placeholder: 'e.g. 2 eggs + toast', required: true },
        { key: 'calories', label: 'kcal (optional)', type: 'number', placeholder: 'kcal' },
      ];
    case 'workout':
      return [
        { key: 'type', label: 'Workout', type: 'text', placeholder: 'e.g. ran 3mi', required: true },
        { key: 'durationMin', label: 'Minutes (optional)', type: 'number', placeholder: 'minutes' },
      ];
    default:
      return [];
  }
}

/** The submit button label for a card ("Save" for the profile-fact BMI/height). */
export function fitSubmitLabel(card: string): string {
  return card === 'bmi' ? 'Save' : 'Log';
}

/** A helper hint under the form (BMI explains it's derived). */
export function fitFormHint(card: string, latest: FitLatest): string {
  if (card !== 'bmi') return '';
  return latest.weightLbs !== null ? 'BMI updates from your height + latest weigh-in.' : 'Log a weight to see your BMI.';
}

// ── chart builders (→ pop-line-chart props) ──────────────────────────────────
export function weightChart(points: FitPoint[], goalWeightLbs: number | null): { series: ChartSeries[]; refLines: ChartRefLine[] } {
  return {
    series: [{ key: 'weight', label: 'Weight (lbs)', color: C_WEIGHT, data: points.map((p) => p.v), axis: 'left', kind: 'line' }],
    refLines: goalWeightLbs != null ? [{ value: goalWeightLbs, color: C_GOAL }] : [],
  };
}

export function glucoseChart(
  points: FitGlucosePoint[],
  gMin: number | null,
  gMax: number | null,
): { series: ChartSeries[]; rangeBands: ChartRangeBand[] } {
  return {
    series: [{ key: 'bg', label: 'Blood sugar', color: C_GLUCOSE, data: points.map((p) => p.v), axis: 'left', kind: 'line' }],
    rangeBands: gMin != null && gMax != null ? [{ from: gMin, to: gMax, color: C_BAND }] : [],
  };
}

export function caloriesChart(bars: FitDayBar[], goal: number | null): { series: ChartSeries[]; refLines: ChartRefLine[]; xLabels: string[] } {
  const shown = bars.slice(-14); // keep bars readable in the panel width
  return {
    series: [{ key: 'cal', label: 'Calories/day', color: C_CAL, data: shown.map((b) => b.v), axis: 'left', kind: 'bar' }],
    refLines: goal != null ? [{ value: goal, color: C_GOAL }] : [],
    xLabels: shown.map((b) => dayLabel(b.day)),
  };
}

// ── readings-by-day display ──────────────────────────────────────────────────
export function readingDisplay(
  domain: FitReadingDomain,
  r: FitDayGlucose | FitDayBody | FitDayFood | FitDayWorkout,
): { glyph: string; main: string; meta: string } {
  if (domain === 'glucose') {
    const g = r as FitDayGlucose;
    return {
      glyph: '🩸',
      main: `${g.value} mg/dL · ${g.context.replace('_', '-')}${g.note ? ` — ${g.note}` : ''}`,
      meta: fmtTime(g.takenAt),
    };
  }
  if (domain === 'body') {
    const b = r as FitDayBody;
    const bits = [b.weightLbs !== null ? `${b.weightLbs} lbs` : '', b.bodyFatPct !== null ? `${b.bodyFatPct}% fat` : ''].filter(Boolean);
    return { glyph: '⚖️', main: bits.join(' · ') || 'body reading', meta: fmtTime(b.takenAt) };
  }
  if (domain === 'food') {
    const f = r as FitDayFood;
    return {
      glyph: '🍎',
      main: `${f.description}${f.calories !== null ? ` — ${f.calories} kcal` : ''}`,
      meta: `${f.mealType} · ${fmtTime(f.loggedAt)}`,
    };
  }
  const w = r as FitDayWorkout;
  const bits = [w.distance !== null ? `${w.distance} mi` : '', w.durationMin !== null ? `${w.durationMin} min` : ''].filter(Boolean);
  return { glyph: '🏃', main: `${w.type}${bits.length ? ` — ${bits.join(' · ')}` : ''}`, meta: fmtTime(w.performedAt) };
}

// ── readings-by-day inline EDIT ──────────────────────────────────────────────
/** The pop-field(s) shown when editing a logged reading, per domain. Mirrors the
 *  monolith's editFieldsFor: glucose = value + context + note, body = weight +
 *  body-fat, food = description + calories, workout = type + minutes + miles. */
export function readingEditFields(domain: FitReadingDomain): FieldSpec[] {
  switch (domain) {
    case 'glucose':
      return [
        { key: 'value', label: 'Glucose (mg/dL)', type: 'number' },
        { key: 'context', label: 'Context', type: 'select', options: BG_CONTEXTS.map((o) => ({ ...o })) },
        { key: 'note', label: 'Note', type: 'text' },
      ];
    case 'body':
      return [
        { key: 'weightLbs', label: 'Weight (lbs)', type: 'number' },
        { key: 'bodyFatPct', label: 'Body fat (%)', type: 'number' },
      ];
    case 'food':
      return [
        { key: 'description', label: 'Food / meal', type: 'text' },
        { key: 'calories', label: 'kcal', type: 'number' },
      ];
    default:
      return [
        { key: 'type', label: 'Workout', type: 'text' },
        { key: 'durationMin', label: 'Minutes', type: 'number' },
        { key: 'distance', label: 'Miles', type: 'number' },
      ];
  }
}

/** Seed the edit form's string values from a reading's current values. */
export function readingInitialValues(
  domain: FitReadingDomain,
  r: FitDayGlucose | FitDayBody | FitDayFood | FitDayWorkout,
): Record<string, string> {
  if (domain === 'glucose') {
    const g = r as FitDayGlucose;
    return {
      value: String(g.value),
      context: BG_CONTEXTS.some((o) => o.value === g.context) ? g.context : 'random',
      note: g.note ?? '',
    };
  }
  if (domain === 'body') {
    const b = r as FitDayBody;
    return {
      weightLbs: b.weightLbs !== null ? String(b.weightLbs) : '',
      bodyFatPct: b.bodyFatPct !== null ? String(b.bodyFatPct) : '',
    };
  }
  if (domain === 'food') {
    const f = r as FitDayFood;
    return { description: f.description, calories: f.calories !== null ? String(f.calories) : '' };
  }
  const w = r as FitDayWorkout;
  return {
    type: w.type,
    durationMin: w.durationMin !== null ? String(w.durationMin) : '',
    distance: w.distance !== null ? String(w.distance) : '',
  };
}

/** Build the update patch from the edit form's values (numbers: ''→null else
 *  Number; text/select: the raw string) — matching the monolith's saveEdit. */
export function buildReadingPatch(domain: FitReadingDomain, values: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of readingEditFields(domain)) {
    const raw = (values[f.key] ?? '').trim();
    patch[f.key] = f.type === 'number' ? (raw === '' ? null : Number(raw)) : raw;
  }
  return patch;
}

/** Total reading count across all four domains for the selected day. */
export function readingCount(dr: FitDayReadings | undefined): number {
  if (!dr) return 0;
  return (dr.glucose?.length ?? 0) + (dr.body?.length ?? 0) + (dr.food?.length ?? 0) + (dr.workouts?.length ?? 0);
}
