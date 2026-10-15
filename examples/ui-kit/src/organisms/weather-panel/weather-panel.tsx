import { Component, Prop, State, Event, EventEmitter, h, Host } from '@stencil/core';
import {
  weatherIcon,
  weatherIconFilled,
  hourlyChart,
  dailyChart,
  type WeatherPanelData,
  type WeatherDay,
  type WeatherHour,
  type ChartData,
} from './weather-panel.helpers';

/**
 * pop-weather-panel — a presentational forecast panel (organism).
 *
 * Renders a saved-location forecast: a current-conditions block, a Hourly / Daily
 * tab toggle, and each tab's list of rows sitting beside a slim VERTICAL
 * `pop-line-chart` whose points line up row-for-row with the list (shared row
 * pitch). It is intentionally **presentation-only**: the host app (e.g. the hub)
 * owns location, network, caching and the chat composer — this component just
 * displays the `data` it is handed and emits `popTabChange` / `popRefresh`.
 *
 * Data arrives as the `data` object prop. From plain HTML / Storybook it is set
 * as a JSON-stringified attribute (`data='${JSON.stringify(forecast)}'`) and
 * parsed defensively here (accepts a string OR an object).
 */

type WxTab = 'hourly' | 'daily';

/** Row pitch (px) shared by the forecast list rows AND the vertical chart, so
 *  each list row lines up with its data point in the slim chart beside it. */
const WX_ROW_H = 44;
/** The vertical chart column width (px). The chart's SVG viewBox width is set to
 *  the SAME value (`vbWidth`) so it renders 1:1 (no horizontal distortion) and the
 *  value labels stay crisp. CSS pins the column to this width (`.wx-vchart`). It is
 *  a real column now — not the old ~72px sliver — legible at sheet + dialog widths. */
const WX_CHART_W = 140;

@Component({
  tag: 'pop-weather-panel',
  encapsulation: { type: 'scoped' },
  styleUrl: 'weather-panel.css',
})
export class PopWeatherPanel {
  /**
   * The forecast to render. Accepts a `WeatherPanelData` object (property
   * binding) OR a JSON string (attribute — how Storybook / plain HTML pass it).
   */
  @Prop() data: WeatherPanelData | string = {};

  /** Panel heading (shown top-left in the header). */
  @Prop() heading = 'Weather';

  /** Loading state — renders a subtle skeleton/spinner instead of the forecast. */
  @Prop() loading = false;

  /**
   * Render the panel's own header (heading + place + refresh). Default true so the
   * component is self-contained (Storybook / standalone). A HOST that supplies its
   * OWN chrome — e.g. the Bucket Hub's PanelShell header with a `pop-sync-status`
   * refresh + `pop-location` trigger — sets `showHeader={false}` so the body
   * (current block + tabs + forecast) renders without a duplicate header. */
  @Prop() showHeader = true;

  /** Active tab — Hourly (default) or Daily. */
  @State() tab: WxTab = 'hourly';

  /** Fires when the user switches the Hourly / Daily tab. */
  @Event({ composed: true, bubbles: true }) popTabChange!: EventEmitter<WxTab>;
  /** Fires when the header refresh button is pressed (host refetches). */
  @Event({ composed: true, bubbles: true }) popRefresh!: EventEmitter<void>;

  /** Parse the `data` prop defensively (string attr OR object property). */
  private parsed(): WeatherPanelData {
    if (typeof this.data === 'string') {
      try {
        return (JSON.parse(this.data) as WeatherPanelData) ?? {};
      } catch {
        return {};
      }
    }
    return this.data ?? {};
  }

  /** Whether we have anything renderable (current, days, or hours). */
  private hasForecast(w: WeatherPanelData): boolean {
    return !!(w.current || w.days?.length || w.hourly?.length);
  }

  private selectTab(next: WxTab) {
    if (this.tab === next) return;
    this.tab = next;
    this.popTabChange.emit(next);
  }

  private onRefresh = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.popRefresh.emit();
  };

  // ── Render pieces ──────────────────────────────────────────────────────────

  private renderHeader(w: WeatherPanelData) {
    return (
      <header class="wx-header">
        <div class="wx-header-titles">
          <h2 class="wx-title">{this.heading}</h2>
          {w.place && <span class="wx-place">{w.place}</span>}
        </div>
        <button
          type="button"
          class="wx-refresh"
          aria-label="Refresh forecast"
          onClick={this.onRefresh}
        >
          <pop-icon name="refresh-outline" label="Refresh" />
        </button>
      </header>
    );
  }

  /** Current-conditions block: big temp + conditions + prominent icon, plus a meta
   *  row of feels-like / wind / today's sunrise+sunset. The big number is the live
   *  "now" reading (the host reconciles it with the hourly "Now" row so they agree).
   *  Sunrise/sunset come from today's daily entry (`today`). */
  private renderCurrent(w: WeatherPanelData, today?: WeatherDay) {
    const c = w.current;
    if (!c) return null;
    // Each meta chip is optional — only the ones with data are pushed, so the row
    // degrades cleanly (no empty gaps / stray separators) when the server hasn't
    // sent feels-like / wind yet. Sunrise/sunset carry an explicit ↑/↓ + a title so
    // they never read as a bare "05:50  20:28".
    const meta: Array<{ icon: string; text: string; title: string }> = [];
    if (typeof c.feelsLike === 'number') meta.push({ icon: 'thermometer-outline', text: `Feels ${c.feelsLike}°`, title: 'Feels like' });
    if (typeof c.wind === 'number') meta.push({ icon: 'navigate-outline', text: `${c.wind} mph`, title: 'Wind' });
    if (today?.sunrise) meta.push({ icon: 'sunny-outline', text: `Sunrise ${today.sunrise}`, title: 'Sunrise' });
    if (today?.sunset) meta.push({ icon: 'moon-outline', text: `Sunset ${today.sunset}`, title: 'Sunset' });
    return (
      <div class="wx-now">
        <pop-icon class="wx-now-icon" name={weatherIconFilled(c.icon)} />
        <div class="wx-now-main">
          <div class="wx-now-head">
            <span class="wx-now-temp">{c.temp}°</span>
            <span class="wx-now-cond">{c.conditions}</span>
          </div>
          {meta.length > 0 && (
            <div class="wx-now-meta">
              {meta.map((m) => (
                <span class="wx-now-metaitem" title={m.title} key={m.text}>
                  <pop-icon name={m.icon} /> {m.text}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Host-supplied place / location control (e.g. the hub's pop-location
            trigger) — lives in the current-conditions card, NOT the header, so it
            can't crowd the panel heading. Empty (0-width) when nothing is slotted. */}
        <div class="wx-now-place"><slot name="place"></slot></div>
      </div>
    );
  }

  /** Segmented Hourly / Daily tabs. */
  private renderTabs() {
    const tab = (key: WxTab, label: string) => (
      <button
        // type="button" so this never submits an enclosing <form>.
        type="button"
        class={{ 'wx-tab': true, 'wx-tab--on': this.tab === key }}
        role="tab"
        aria-selected={String(this.tab === key)}
        onClick={(e: MouseEvent) => { e.preventDefault(); this.selectTab(key); }}
      >
        {label}
      </button>
    );
    return (
      <div class="wx-tabs" role="tablist">
        {tab('hourly', 'Hourly')}
        {tab('daily', 'Daily')}
      </div>
    );
  }

  /** Shared legend above the two-column (list + vertical chart) forecast area. */
  private renderLegend(chart: ChartData) {
    return (
      <div class="wx-legend" aria-hidden="true">
        {chart.series.map((s) => (
          <span class="wx-legend-item" key={s.key}>
            <span class="wx-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    );
  }

  private renderHourly(hours: WeatherHour[], today?: WeatherDay) {
    const chart = hourlyChart(hours, today);
    const hasChart = hours.length > 0;
    return (
      <div class="wx-forecast">
        {hasChart && this.renderLegend(chart)}
        <div class="wx-scroll">
          <div class="wx-cols">
            <div class="wx-hours">
              {hours.map((hr) => (
                <div class="wx-hour" key={hr.time}>
                  <span class="wx-hour-time">{hr.label}</span>
                  <pop-icon
                    class={{ 'wx-hour-icon': true, 'wx-hour-icon--night': !hr.isDay }}
                    name={weatherIcon(hr.icon)}
                  />
                  <span class="wx-hour-temp">{hr.temp}°</span>
                  <span class={{ 'wx-hour-precip': true, 'wx-hour-precip--dry': hr.precipProb < 20 }}>
                    <pop-icon name="water-outline" /> {hr.precipProb}%
                  </span>
                </div>
              ))}
            </div>
            {hasChart && (
              <pop-line-chart
                class="wx-vchart"
                orientation="vertical"
                rowHeight={WX_ROW_H}
                vbWidth={WX_CHART_W}
                showValueLabels={true}
                leftUnit="°"
                rightUnit="%"
                chartTitle="Hourly temperature, humidity and precipitation"
                series={chart.series as any}
                bands={chart.bands as any}
                markers={chart.markers as any}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  private renderDaily(days: WeatherDay[]) {
    const chart = dailyChart(days);
    const hasChart = days.length > 0;
    return (
      <div class="wx-forecast">
        {hasChart && this.renderLegend(chart)}
        <div class="wx-scroll">
          <div class="wx-cols">
            <div class="wx-days">
              {days.map((d) => (
                <div class="wx-day" key={d.date}>
                  <span class="wx-day-label">{d.label}</span>
                  <pop-icon class="wx-day-icon" name={weatherIcon(d.icon)} />
                  <span class="wx-day-cond">{d.conditions}</span>
                  <span class="wx-day-temp"><b>{d.hi}°</b> <span class="wx-lo">{d.lo}°</span></span>
                  {d.precip >= 20 && (
                    <span class="wx-day-precip"><pop-icon name="rainy-outline" /> {d.precip}%</span>
                  )}
                </div>
              ))}
            </div>
            {hasChart && (
              <pop-line-chart
                class="wx-vchart"
                orientation="vertical"
                rowHeight={WX_ROW_H}
                vbWidth={WX_CHART_W}
                showValueLabels={true}
                leftUnit="°"
                rightUnit="%"
                chartTitle="Daily high/low, humidity and precipitation"
                series={chart.series as any}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  /** Subtle skeleton shown while `loading` and there's no forecast to display. */
  private renderSkeleton() {
    return (
      <div class="wx-skeleton" role="status" aria-live="polite">
        <span class="wx-spin" aria-hidden="true" />
        <span class="wx-skeleton-text">Loading forecast…</span>
      </div>
    );
  }

  /** Empty state — no data handed in and not loading. */
  private renderEmpty() {
    return (
      <div class="wx-empty" role="status">
        <pop-icon class="wx-empty-icon" name="partly-sunny-outline" />
        <span>No forecast to show.</span>
      </div>
    );
  }

  render() {
    const w = this.parsed();
    const hasForecast = this.hasForecast(w);

    return (
      <Host>
        <section class="wx" aria-label={this.heading}>
          {this.showHeader && this.renderHeader(w)}
          {hasForecast
            ? [
                this.renderCurrent(w, w.days?.[0]),
                this.renderTabs(),
                this.tab === 'hourly'
                  ? this.renderHourly(w.hourly ?? [], w.days?.[0])
                  : this.renderDaily(w.days ?? []),
              ]
            : this.loading
              ? this.renderSkeleton()
              : this.renderEmpty()}
        </section>
      </Host>
    );
  }
}
