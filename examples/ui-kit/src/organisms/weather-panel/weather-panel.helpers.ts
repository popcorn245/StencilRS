/**
 * Weather-panel helpers — pure, unit-testable, self-contained.
 *
 * Ported (copied, NOT imported) from bucket-hub's `state/weather.ts` so ui-kit
 * stays dependency-free. Everything here is presentation logic: icon mapping and
 * the chart-series builders that feed `pop-line-chart`. Consumers own the data.
 */

/** Coarse weather category → drives icon selection. */
export type WeatherIcon = 'sunny' | 'partly' | 'cloudy' | 'rainy' | 'snow' | 'storm' | 'fog';

/** One day in the 10-day outlook. */
export interface WeatherDay {
  date: string;
  label: string;
  code: number;
  conditions: string;
  icon: WeatherIcon;
  hi: number;
  lo: number;
  precip: number;
  wind: number;
  humidity?: number;
  sunrise?: string;
  sunset?: string;
}

/** One hour in the hourly outlook. */
export interface WeatherHour {
  time: string;
  label: string;
  temp: number;
  humidity: number;
  precipProb: number;
  isDay: boolean;
  code: number;
  icon: WeatherIcon;
}

/** Current-conditions snapshot. */
export interface WeatherCurrent {
  temp: number;
  conditions: string;
  icon: WeatherIcon;
  /** "Feels like" apparent temperature (°F). */
  feelsLike?: number;
  /** Current wind speed (mph). */
  wind?: number;
}

/** The full forecast payload the panel renders (props-in). */
export interface WeatherPanelData {
  place?: string;
  timezone?: string;
  current?: WeatherCurrent | null;
  days?: WeatherDay[];
  hourly?: WeatherHour[];
}

/** Map a coarse weather category → an ionicon name (outline — small list rows). */
export function weatherIcon(cat: WeatherIcon | undefined): string {
  switch (cat) {
    case 'sunny': return 'sunny-outline';
    case 'partly': return 'partly-sunny-outline';
    case 'cloudy': return 'cloud-outline';
    case 'rainy': return 'rainy-outline';
    case 'snow': return 'snow-outline';
    case 'storm': return 'thunderstorm-outline';
    case 'fog': return 'cloudy-outline';
    default: return 'partly-sunny-outline';
  }
}

/**
 * Map a coarse weather category → a FILLED ionicon name — the bolder glyph for
 * the prominent current-conditions block (vs the outline variants used in the
 * small hourly/daily rows).
 */
export function weatherIconFilled(cat: WeatherIcon | undefined): string {
  switch (cat) {
    case 'sunny': return 'sunny';
    case 'partly': return 'partly-sunny';
    case 'cloudy': return 'cloud';
    case 'rainy': return 'rainy';
    case 'snow': return 'snow';
    case 'storm': return 'thunderstorm';
    case 'fog': return 'cloudy';
    default: return 'partly-sunny';
  }
}

// ── Chart series builders (feed pop-line-chart) ──────────────────────────────
// Distinct, legible-in-both-themes colors: temp=orange, humidity=blue,
// precip=light-blue (area). Temp on the left axis (°F), humidity/precip on the
// right (%). Returned shapes are JSON-serializable for the chart props.

/** Mirrors pop-line-chart's ChartSeries (kept local to avoid a cross-import). */
export interface ChartSeriesData {
  key: string;
  label: string;
  color: string;
  data: (number | null)[];
  axis: 'left' | 'right';
  kind: 'line' | 'area';
}
export interface ChartMarkerData { index: number; icon: 'sunrise' | 'sunset' }
export interface ChartBandData { from: number; to: number }
export interface ChartData {
  series: ChartSeriesData[];
  xLabels: string[];
  markers: ChartMarkerData[];
  bands: ChartBandData[];
}

const C_TEMP = '#f97316';
const C_HUMIDITY = '#3b82f6';
const C_PRECIP = '#60a5fa';

/** Parse an Open-Meteo "HH:MM" sun time → hour index 0..23 (rounded). */
function sunHour(hhmm: string | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Math.min(23, Math.max(0, Math.round(Number(m[1]) + Number(m[2]) / 60)));
}

/**
 * Hourly chart: temp (line, °F) + humidity (line, %) + precip prob (area, %),
 * with sunrise/sunset markers + night shading derived from each hour's isDay.
 */
export function hourlyChart(hours: WeatherHour[], today?: WeatherDay): ChartData {
  const series: ChartSeriesData[] = [
    { key: 'temp', label: 'Temp', color: C_TEMP, data: hours.map((h) => h.temp), axis: 'left', kind: 'line' },
    { key: 'humidity', label: 'Humidity', color: C_HUMIDITY, data: hours.map((h) => h.humidity), axis: 'right', kind: 'line' },
    { key: 'precip', label: 'Precip', color: C_PRECIP, data: hours.map((h) => h.precipProb), axis: 'right', kind: 'area' },
  ];
  const xLabels = hours.map((h) => h.label);

  // Night shading: contiguous runs where isDay === false.
  const bands: ChartBandData[] = [];
  let runStart = -1;
  hours.forEach((h, i) => {
    if (!h.isDay && runStart < 0) runStart = i;
    if ((h.isDay || i === hours.length - 1) && runStart >= 0) {
      const end = h.isDay ? i - 1 : i;
      bands.push({ from: runStart, to: end });
      runStart = -1;
    }
  });

  // Sun markers: place at the hour index whose time matches sunrise/sunset.
  const markers: ChartMarkerData[] = [];
  if (today) {
    const sr = sunHour(today.sunrise);
    const ss = sunHour(today.sunset);
    const idxForHour = (targetHour: number | null): number => {
      if (targetHour == null) return -1;
      return hours.findIndex((h) => {
        const m = /T(\d{2}):/.exec(h.time);
        return m ? Number(m[1]) === targetHour : false;
      });
    };
    const sri = idxForHour(sr);
    const ssi = idxForHour(ss);
    if (sri >= 0) markers.push({ index: sri, icon: 'sunrise' });
    if (ssi >= 0) markers.push({ index: ssi, icon: 'sunset' });
  }

  return { series, xLabels, markers, bands };
}

/**
 * 10-day chart: temp hi + lo (two lines, °F) + humidity (line, %) + precip prob
 * (area, %) across the days. No per-day sun band (out of scope for 10-day).
 */
export function dailyChart(days: WeatherDay[]): ChartData {
  const series: ChartSeriesData[] = [
    { key: 'hi', label: 'High', color: C_TEMP, data: days.map((d) => d.hi), axis: 'left', kind: 'line' },
    { key: 'lo', label: 'Low', color: '#fbbf24', data: days.map((d) => d.lo), axis: 'left', kind: 'line' },
    { key: 'humidity', label: 'Humidity', color: C_HUMIDITY, data: days.map((d) => (typeof d.humidity === 'number' ? d.humidity : null)), axis: 'right', kind: 'line' },
    { key: 'precip', label: 'Precip', color: C_PRECIP, data: days.map((d) => d.precip), axis: 'right', kind: 'area' },
  ];
  // Short labels: drop the weekday prefix for brevity ("Jun 23" / "Today").
  const xLabels = days.map((d) => (d.label === 'Today' || d.label === 'Tomorrow' ? d.label : d.label.replace(/^\w+\s/, '')));
  return { series, xLabels, markers: [], bands: [] };
}
