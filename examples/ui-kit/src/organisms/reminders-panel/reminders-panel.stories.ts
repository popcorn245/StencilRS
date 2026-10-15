import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-reminders-panel — a presentation-only Reminders panel. The host owns the
 * network, optimistic mutations, clock-skew-safe deadline math, and the alarm
 * engine; the panel displays what it is handed and emits `pop*` events.
 *
 * The shared red→amber→blue DRAIN bar in the countdown hero empties right→left —
 * the same gradient the hub tile + collapsed chip reuse. Object/array props are
 * JSON-stringified attributes here; in an app they're set as properties. Use the
 * theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/RemindersPanel',
  argTypes: {
    filter: { control: 'text' },
    loading: { control: 'boolean' },
    showHeader: { control: 'boolean' },
  },
  parameters: {
    actions: {
      handles: [
        'popCreate', 'popSnooze', 'popDismiss', 'popEditReminder', 'popDelete',
        'popFilterChange', 'popSearchChange', 'popAlarmChange', 'popAlarmTest',
        'popStopRing', 'popCountdownDone', 'popRefresh', 'popClose', 'popUnlock',
      ],
    },
    docs: {
      description: {
        component:
          'pop-reminders-panel — countdown hero with the shared right→left drain bar, ringing banner, alarm-settings drawer (sound/volume/Sound·Vibration·Push + Test), search, a segmented filter with inline counts (Overdue goes red), quick-create, and per-row snooze-menu / dismiss / edit / delete with overdue + ringing styling. Presentation-only: emits popCreate / popSnooze / popDismiss / popEditReminder / popDelete / popFilterChange / popSearchChange / popAlarmChange / popAlarmTest / popCountdownDone.',
      },
    },
  },
};

export default meta;

// ── mock data ────────────────────────────────────────────────────────────────
const now = Date.now();
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

const reminders = [
  { id: 'r1', title: 'Take out the trash', reminderAt: iso(now + 14 * MIN + 32_000), fireInMs: 14 * MIN + 32_000, recurring: false, overdue: false, status: 'open' },
  { id: 'r2', title: 'Standup', reminderAt: iso(now + 17 * 3600_000), fireInMs: 17 * 3600_000, recurring: true, overdue: false, status: 'open' },
  { id: 'r3', title: 'Call the dentist', reminderAt: iso(now - 19 * 3600_000), fireInMs: -19 * 3600_000, recurring: false, overdue: true, status: 'open' },
  { id: 'r4', title: 'Water the plants', reminderAt: iso(now + 56 * 3600_000), fireInMs: 56 * 3600_000, recurring: true, overdue: false, status: 'open' },
];
const counts = { upcoming: 3, today: 2, overdue: 1, recurring: 2 };
const alarm = { sound: 'chime', volume: 0.7, soundOn: true, vibrateOn: true, pushOn: false };

function panel(opts: {
  reminders?: unknown;
  counts?: unknown;
  filter?: string;
  loading?: boolean;
  error?: string;
  ringing?: unknown;
  deadline?: number;
  heroTotal?: number;
  nextTitle?: string;
  width?: number;
} = {}) {
  const attr = (o: unknown) => JSON.stringify(o).replace(/'/g, '&#39;');
  const rows = opts.reminders ?? reminders;
  const withData = !opts.loading && !opts.error;
  return `
    <div style="max-width:${opts.width ?? 390}px; padding:16px; background:var(--surface-canvas,#eef2f8); border-radius:20px;">
      <pop-reminders-panel
        filter="${opts.filter ?? 'upcoming'}"
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.error ? `error="${opts.error}"` : ''}
        next-title="${opts.nextTitle ?? 'Take out the trash'}"
        countdown-deadline="${opts.deadline ?? now + 14 * MIN + 32_000}"
        hero-total-ms="${opts.heroTotal ?? 15 * MIN}"
        counts='${attr(opts.counts ?? counts)}'
        alarm='${attr(alarm)}'
        ${opts.ringing ? `ringing='${attr(opts.ringing)}'` : ''}
        ${withData ? `reminders='${attr(rows)}'` : ''}
      ></pop-reminders-panel>
    </div>
  `;
}

/** Fully-loaded sheet (390px). */
export const Default: StoryObj = {
  name: 'Default — loaded (390px sheet)',
  render: () => panel(),
};

/** Imminent — the soonest reminder is under a minute; hero + soonest row go red. */
export const Imminent: StoryObj = {
  name: 'Imminent (under a minute)',
  render: () =>
    panel({
      nextTitle: 'Standup starting',
      deadline: now + 47_000,
      heroTotal: 60_000,
      reminders: [
        { id: 'r1', title: 'Standup starting', reminderAt: iso(now + 47_000), fireInMs: 47_000, recurring: false, overdue: false, status: 'open' },
        ...reminders.slice(1),
      ],
      counts: { upcoming: 3, today: 2, overdue: 1, recurring: 2 },
    }),
};

/** Ringing — the alarm banner + the ringing row pulse. */
export const Ringing: StoryObj = {
  name: 'Ringing (alarm banner)',
  render: () =>
    panel({
      ringing: { id: 'r1', title: 'Take out the trash' },
      deadline: now,
      heroTotal: 15 * MIN,
    }),
};

/** Overdue filter — the Overdue segment count badge is red. */
export const OverdueFilter: StoryObj = {
  name: 'Overdue filter',
  render: () =>
    panel({
      filter: 'overdue',
      reminders: [reminders[2]],
    }),
};

/** Loading (no data yet). */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => panel({ loading: true }),
};

/** Error with a Retry. */
export const ErrorState: StoryObj = {
  name: 'Error',
  render: () => panel({ error: "Couldn't load your reminders right now." }),
};
