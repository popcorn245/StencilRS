import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-fit-panel — a presentation-only health panel. The host owns the network,
 * day/state and PanelShell chrome; the panel displays the data it is handed and
 * emits `pop*` events. Object/array props are passed as JSON-stringified
 * attributes here; in an app they're set as properties. Use the theme toolbar
 * for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/FitPanel',
  argTypes: {
    days: { control: 'text' },
    activeCard: { control: 'text' },
    loading: { control: 'boolean' },
    logBusy: { control: 'boolean' },
  },
  parameters: {
    actions: { handles: ['popCardTap', 'popLog', 'popCancelLog', 'popDayChange', 'popRefresh'] },
    docs: {
      description: {
        component:
          'pop-fit-panel — six tappable metric cards (via pop-metric-card), an inline log form (pop-field) that opens above the grid, the readings-by-day list, and three consolidated trend charts via one pop-line-chart (weight line + goal, blood-sugar line + normal-range band, calories bars + goal). Presentation-only: emits popCardTap / popLog / popCancelLog / popDayChange / popRefresh. The old user/child switcher is gone (single-user).',
      },
    },
  },
};

export default meta;

// ── mock data ────────────────────────────────────────────────────────────────
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

const latest = {
  weightLbs: 150.7,
  weightAt: daysAgo(4).getTime(),
  bodyFatPct: 14.7,
  bmi: 21,
  glucose: 101,
  glucoseAt: daysAgo(0).getTime(),
  glucoseContext: 'random',
  caloriesToday: 0,
  workoutsInWindow: 2,
};
const goals = {
  glucoseMin: 70,
  glucoseMax: 99,
  goalWeightLbs: 148,
  dailyCalorieGoal: 2000,
  glucoseBandSource: 'personal',
};
const weightSeries = [155, 153.4, 152, 150.2, 151, 150.7].map((v, i) => ({ t: daysAgo(25 - i * 5).getTime(), v }));
const glucoseSeries = [96, 110, 101, 88, 105, 101].map((v, i) => ({
  t: daysAgo(25 - i * 5).getTime(),
  v,
  context: 'random',
  verdict: v > 99 ? 'above' : 'in_range',
}));
const caloriesSeries = [1850, 2100, 1720, 1990, 2240, 1680, 0].map((v, i) => ({ day: iso(daysAgo(6 - i)), v }));
const readings = {
  glucose: [{ id: 'g1', value: 101, context: 'random', takenAt: daysAgo(0).getTime(), note: null }],
  body: [],
  food: [],
  workouts: [],
};

function panel(opts: {
  activeCard?: string;
  logReply?: string;
  logBusy?: boolean;
  loading?: boolean;
  error?: string;
  days?: string;
  width?: number;
  hasData?: boolean;
}) {
  const attr = (o: unknown) => JSON.stringify(o).replace(/'/g, '&#39;');
  const withData = opts.hasData !== false && !opts.loading && !opts.error;
  return `
    <div style="max-width:${opts.width ?? 460}px; padding:16px; background:var(--surface-canvas,#eef3fb); border-radius:16px;">
      <pop-fit-panel
        ${opts.activeCard ? `active-card="${opts.activeCard}"` : ''}
        ${opts.logReply ? `log-reply="${opts.logReply}"` : ''}
        ${opts.logBusy ? 'log-busy="true"' : ''}
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.error ? `error="${opts.error}"` : ''}
        days="${opts.days ?? iso(today)}"
        ${withData ? `latest='${attr(latest)}'` : ''}
        ${withData ? `goals='${attr(goals)}'` : ''}
        ${withData ? `weight-series='${attr(weightSeries)}'` : ''}
        ${withData ? `glucose-series='${attr(glucoseSeries)}'` : ''}
        ${withData ? `calories-series='${attr(caloriesSeries)}'` : ''}
        ${withData ? `readings='${attr(readings)}'` : ''}
      ></pop-fit-panel>
    </div>
  `;
}

/** Fully-loaded panel. */
export const Default: StoryObj = {
  name: 'Default — loaded',
  render: () => panel({}),
};

/** A card's log form open in the action zone (Weight). */
export const CardOpen: StoryObj = {
  name: 'Log form open (Weight)',
  render: () => panel({ activeCard: 'weight' }),
};

/** Blood-sugar form open — keeps its context select. */
export const BloodSugarForm: StoryObj = {
  name: 'Log form open (Blood sugar)',
  render: () => panel({ activeCard: 'bg', logReply: '' }),
};

/** Sheet width (~360px) — verifies the card grid + charts stay legible. */
export const Narrow: StoryObj = {
  name: 'Narrow (sheet ~360px)',
  render: () => panel({ width: 360 }),
};

/** Loading state (no data yet). */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => panel({ loading: true, hasData: false }),
};

/** Error state with a Retry. */
export const ErrorState: StoryObj = {
  name: 'Error',
  render: () => panel({ error: "Couldn't load your health data.", hasData: false }),
};
