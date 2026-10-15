import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-weather-panel — a presentational forecast panel. The host owns location,
 * network and caching; the panel just displays the `data` it is handed and emits
 * `popTabChange` / `popRefresh`. `data` is an object prop; here it is passed as a
 * JSON-stringified attribute so it renders in static Storybook builds (in an app
 * you'd set it as a property).
 */
const meta: Meta = {
  title: 'Components/Organisms/WeatherPanel',
  argTypes: {
    heading: { control: 'text' },
    loading: { control: 'boolean' },
  },
  parameters: {
    actions: {
      handles: ['popTabChange', 'popRefresh'],
    },
    docs: {
      description: {
        component:
          'pop-weather-panel — a presentation-only forecast panel (organism). Renders a current-conditions block, a Hourly / Daily tab toggle, and each tab’s list of rows beside a slim vertical `pop-line-chart` whose points line up row-for-row with the list. The host app (e.g. the Bucket Hub) owns location, network, caching and any chat composer — this component just displays the `data` object it is handed. `data` is passed as a JSON-stringified attribute here; in an app it is set as a property. Emits `popTabChange` (`"hourly" | "daily"`) and `popRefresh` (void).',
      },
    },
  },
};

export default meta;

// ── mock forecast ────────────────────────────────────────────────────────────
type Icon = 'sunny' | 'partly' | 'cloudy' | 'rainy' | 'snow' | 'storm' | 'fog';

const HOUR_LABELS = ['Now', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p', '12a', '1a', '2a', '3a'];
const HOUR_TEMPS = [78, 80, 82, 83, 84, 83, 81, 78, 74, 71, 69, 67, 66, 65, 64, 63];
const HOUR_HUM = [42, 40, 38, 37, 39, 44, 50, 58, 65, 70, 73, 75, 77, 78, 80, 82];
const HOUR_PRECIP = [5, 5, 10, 20, 35, 45, 30, 15, 10, 5, 5, 0, 0, 0, 0, 5];
const HOUR_ICON: Icon[] = ['sunny', 'sunny', 'partly', 'partly', 'rainy', 'rainy', 'partly', 'partly', 'cloudy', 'cloudy', 'cloudy', 'partly', 'partly', 'partly', 'partly', 'partly'];

const hourly = HOUR_LABELS.map((label, i) => ({
  time: `2026-07-09T${String((13 + i) % 24).padStart(2, '0')}:00`,
  label,
  temp: HOUR_TEMPS[i],
  humidity: HOUR_HUM[i],
  precipProb: HOUR_PRECIP[i],
  isDay: (13 + i) % 24 >= 6 && (13 + i) % 24 < 20,
  code: 0,
  icon: HOUR_ICON[i],
}));

const DAY_LABELS = ['Today', 'Tomorrow', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const DAY_HI = [84, 88, 90, 87, 82, 79, 83, 86, 88, 85];
const DAY_LO = [66, 68, 70, 69, 64, 61, 63, 66, 68, 67];
const DAY_PRECIP = [45, 10, 5, 20, 60, 55, 15, 5, 10, 25];
const DAY_HUM = [58, 46, 40, 52, 72, 68, 50, 42, 45, 55];
const DAY_COND = ['Rain showers', 'Sunny', 'Sunny', 'Partly cloudy', 'Thunderstorms', 'Rain', 'Partly cloudy', 'Sunny', 'Sunny', 'Cloudy'];
const DAY_ICON: Icon[] = ['rainy', 'sunny', 'sunny', 'partly', 'storm', 'rainy', 'partly', 'sunny', 'sunny', 'cloudy'];

const days = DAY_LABELS.map((label, i) => ({
  date: `2026-07-${String(9 + i).padStart(2, '0')}`,
  label,
  code: 0,
  conditions: DAY_COND[i],
  icon: DAY_ICON[i],
  hi: DAY_HI[i],
  lo: DAY_LO[i],
  precip: DAY_PRECIP[i],
  wind: 8 + i,
  humidity: DAY_HUM[i],
  sunrise: '06:04',
  sunset: '20:22',
}));

const forecast = {
  place: 'St. Charles, MO',
  timezone: 'America/Chicago',
  current: { temp: 78, conditions: 'Partly cloudy', icon: 'partly' as Icon, feelsLike: 82, wind: 9 },
  days,
  hourly,
};

/** Mounts the panel in a bounded card with the supplied forecast (JSON attr). */
function panel(opts: { data?: unknown; heading?: string; loading?: boolean; width?: number }) {
  const json = opts.data != null ? JSON.stringify(opts.data).replace(/'/g, '&#39;') : '';
  return `
    <div style="max-width: ${opts.width ?? 460}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <pop-weather-panel
        ${opts.heading ? `heading="${opts.heading}"` : ''}
        ${opts.loading ? 'loading="true"' : ''}
        ${json ? `data='${json}'` : ''}
      ></pop-weather-panel>
    </div>
  `;
}

/** Fully-loaded forecast (default opened state — Hourly tab). */
export const Default: StoryObj = {
  name: 'Default — loaded',
  render: (args) => panel({ data: forecast, heading: args.heading }),
  args: { heading: 'Weather', loading: false },
};

/** Sheet width (~360px) — verifies the list + real chart column stay legible on a
 *  phone-sized surface (the narrowest tier). Use the theme toolbar for dark. */
export const Narrow: StoryObj = {
  name: 'Narrow (sheet ~360px)',
  render: (args) => panel({ data: forecast, heading: args.heading, width: 360 }),
  args: { heading: 'Weather', loading: false },
};

/** Loading state → subtle spinner/skeleton (no data yet). */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => panel({ loading: true }),
};

/** No forecast handed in and not loading → the empty state. */
export const Empty: StoryObj = {
  name: 'Empty',
  render: () => panel({ data: {} }),
};
