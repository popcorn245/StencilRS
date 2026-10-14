import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import { weatherIcon, weatherIconFilled, hourlyChart, dailyChart, } from './weather-panel.helpers';
import PopWeatherPanelStyle0 from "./ui-kit/organisms/weather-panel/weather-panel.css?tag=pop-weather-panel&encapsulation=scoped";
/** Row pitch (px) shared by the forecast list rows AND the vertical chart, so
 *  each list row lines up with its data point in the slim chart beside it. */
const WX_ROW_H = 44;
/** The vertical chart column width (px). The chart's SVG viewBox width is set to
 *  the SAME value (`vbWidth`) so it renders 1:1 (no horizontal distortion) and the
 *  value labels stay crisp. CSS pins the column to this width (`.wx-vchart`). It is
 *  a real column now — not the old ~72px sliver — legible at sheet + dialog widths. */
const WX_CHART_W = 140;
const PopWeatherPanel = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popTabChange = __stencil_createEvent(this, "popTabChange", 7);
        this.popRefresh = __stencil_createEvent(this, "popRefresh", 7);
    }
    /**
     * The forecast to render. Accepts a `WeatherPanelData` object (property
     * binding) OR a JSON string (attribute — how Storybook / plain HTML pass it).
     */
    data = {};
    /** Panel heading (shown top-left in the header). */
    heading = 'Weather';
    /** Loading state — renders a subtle skeleton/spinner instead of the forecast. */
    loading = false;
    /**
     * Render the panel's own header (heading + place + refresh). Default true so the
     * component is self-contained (Storybook / standalone). A HOST that supplies its
     * OWN chrome — e.g. the Bucket Hub's PanelShell header with a `pop-sync-status`
     * refresh + `pop-location` trigger — sets `showHeader={false}` so the body
     * (current block + tabs + forecast) renders without a duplicate header. */
    showHeader = true;
    /** Active tab — Hourly (default) or Daily. */
    tab = 'hourly';
    /** Fires when the user switches the Hourly / Daily tab. */
    popTabChange;
    /** Fires when the header refresh button is pressed (host refetches). */
    popRefresh;
    /** Parse the `data` prop defensively (string attr OR object property). */
    parsed() {
        if (typeof this.data === 'string') {
            try {
                return JSON.parse(this.data) ?? {};
            }
            catch {
                return {};
            }
        }
        return this.data ?? {};
    }
    /** Whether we have anything renderable (current, days, or hours). */
    hasForecast(w) {
        return !!(w.current || w.days?.length || w.hourly?.length);
    }
    selectTab(next) {
        if (this.tab === next)
            return;
        this.tab = next;
        this.popTabChange.emit(next);
    }
    onRefresh = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.popRefresh.emit();
    };
    // ── Render pieces ──────────────────────────────────────────────────────────
    renderHeader(w) {
        return (h("header", { class: "wx-header" },
            h("div", { class: "wx-header-titles" },
                h("h2", { class: "wx-title" }, this.heading),
                w.place && h("span", { class: "wx-place" }, w.place)),
            h("button", { type: "button", class: "wx-refresh", "aria-label": "Refresh forecast", onClick: this.onRefresh },
                h("pop-icon", { name: "refresh-outline", label: "Refresh" }))));
    }
    /** Current-conditions block: big temp + conditions + prominent icon, plus a meta
     *  row of feels-like / wind / today's sunrise+sunset. The big number is the live
     *  "now" reading (the host reconciles it with the hourly "Now" row so they agree).
     *  Sunrise/sunset come from today's daily entry (`today`). */
    renderCurrent(w, today) {
        const c = w.current;
        if (!c)
            return null;
        // Each meta chip is optional — only the ones with data are pushed, so the row
        // degrades cleanly (no empty gaps / stray separators) when the server hasn't
        // sent feels-like / wind yet. Sunrise/sunset carry an explicit ↑/↓ + a title so
        // they never read as a bare "05:50  20:28".
        const meta = [];
        if (typeof c.feelsLike === 'number')
            meta.push({ icon: 'thermometer-outline', text: `Feels ${c.feelsLike}°`, title: 'Feels like' });
        if (typeof c.wind === 'number')
            meta.push({ icon: 'navigate-outline', text: `${c.wind} mph`, title: 'Wind' });
        if (today?.sunrise)
            meta.push({ icon: 'sunny-outline', text: `Sunrise ${today.sunrise}`, title: 'Sunrise' });
        if (today?.sunset)
            meta.push({ icon: 'moon-outline', text: `Sunset ${today.sunset}`, title: 'Sunset' });
        return (h("div", { class: "wx-now" },
            h("pop-icon", { class: "wx-now-icon", name: weatherIconFilled(c.icon) }),
            h("div", { class: "wx-now-main" },
                h("div", { class: "wx-now-head" },
                    h("span", { class: "wx-now-temp" },
                        c.temp,
                        "\u00B0"),
                    h("span", { class: "wx-now-cond" }, c.conditions)),
                meta.length > 0 && (h("div", { class: "wx-now-meta" }, meta.map((m) => (h("span", { class: "wx-now-metaitem", title: m.title, key: m.text },
                    h("pop-icon", { name: m.icon }),
                    " ",
                    m.text)))))),
            h("div", { class: "wx-now-place" },
                h("slot", { name: "place" }))));
    }
    /** Segmented Hourly / Daily tabs. */
    renderTabs() {
        const tab = (key, label) => (h("button", { 
            // type="button" so this never submits an enclosing <form>.
            type: "button", class: { 'wx-tab': true, 'wx-tab--on': this.tab === key }, role: "tab", "aria-selected": String(this.tab === key), onClick: (e) => { e.preventDefault(); this.selectTab(key); } }, label));
        return (h("div", { class: "wx-tabs", role: "tablist" },
            tab('hourly', 'Hourly'),
            tab('daily', 'Daily')));
    }
    /** Shared legend above the two-column (list + vertical chart) forecast area. */
    renderLegend(chart) {
        return (h("div", { class: "wx-legend", "aria-hidden": "true" }, chart.series.map((s) => (h("span", { class: "wx-legend-item", key: s.key },
            h("span", { class: "wx-legend-swatch", style: { background: s.color } }),
            s.label)))));
    }
    renderHourly(hours, today) {
        const chart = hourlyChart(hours, today);
        const hasChart = hours.length > 0;
        return (h("div", { class: "wx-forecast" },
            hasChart && this.renderLegend(chart),
            h("div", { class: "wx-scroll" },
                h("div", { class: "wx-cols" },
                    h("div", { class: "wx-hours" }, hours.map((hr) => (h("div", { class: "wx-hour", key: hr.time },
                        h("span", { class: "wx-hour-time" }, hr.label),
                        h("pop-icon", { class: { 'wx-hour-icon': true, 'wx-hour-icon--night': !hr.isDay }, name: weatherIcon(hr.icon) }),
                        h("span", { class: "wx-hour-temp" },
                            hr.temp,
                            "\u00B0"),
                        h("span", { class: { 'wx-hour-precip': true, 'wx-hour-precip--dry': hr.precipProb < 20 } },
                            h("pop-icon", { name: "water-outline" }),
                            " ",
                            hr.precipProb,
                            "%"))))),
                    hasChart && (h("pop-line-chart", { class: "wx-vchart", orientation: "vertical", rowHeight: WX_ROW_H, vbWidth: WX_CHART_W, showValueLabels: true, leftUnit: "\u00B0", rightUnit: "%", chartTitle: "Hourly temperature, humidity and precipitation", series: chart.series, bands: chart.bands, markers: chart.markers }))))));
    }
    renderDaily(days) {
        const chart = dailyChart(days);
        const hasChart = days.length > 0;
        return (h("div", { class: "wx-forecast" },
            hasChart && this.renderLegend(chart),
            h("div", { class: "wx-scroll" },
                h("div", { class: "wx-cols" },
                    h("div", { class: "wx-days" }, days.map((d) => (h("div", { class: "wx-day", key: d.date },
                        h("span", { class: "wx-day-label" }, d.label),
                        h("pop-icon", { class: "wx-day-icon", name: weatherIcon(d.icon) }),
                        h("span", { class: "wx-day-cond" }, d.conditions),
                        h("span", { class: "wx-day-temp" },
                            h("b", null,
                                d.hi,
                                "\u00B0"),
                            " ",
                            h("span", { class: "wx-lo" },
                                d.lo,
                                "\u00B0")),
                        d.precip >= 20 && (h("span", { class: "wx-day-precip" },
                            h("pop-icon", { name: "rainy-outline" }),
                            " ",
                            d.precip,
                            "%")))))),
                    hasChart && (h("pop-line-chart", { class: "wx-vchart", orientation: "vertical", rowHeight: WX_ROW_H, vbWidth: WX_CHART_W, showValueLabels: true, leftUnit: "\u00B0", rightUnit: "%", chartTitle: "Daily high/low, humidity and precipitation", series: chart.series }))))));
    }
    /** Subtle skeleton shown while `loading` and there's no forecast to display. */
    renderSkeleton() {
        return (h("div", { class: "wx-skeleton", role: "status", "aria-live": "polite" },
            h("span", { class: "wx-spin", "aria-hidden": "true" }),
            h("span", { class: "wx-skeleton-text" }, "Loading forecast\u2026")));
    }
    /** Empty state — no data handed in and not loading. */
    renderEmpty() {
        return (h("div", { class: "wx-empty", role: "status" },
            h("pop-icon", { class: "wx-empty-icon", name: "partly-sunny-outline" }),
            h("span", null, "No forecast to show.")));
    }
    render() {
        const w = this.parsed();
        const hasForecast = this.hasForecast(w);
        return (h(Host, { key: '0' },
            h("section", { key: '1', class: "wx", "aria-label": this.heading },
                this.showHeader && this.renderHeader(w),
                hasForecast
                    ? [
                        this.renderCurrent(w, w.days?.[0]),
                        this.renderTabs(),
                        this.tab === 'hourly'
                            ? this.renderHourly(w.hourly ?? [], w.days?.[0])
                            : this.renderDaily(w.days ?? []),
                    ]
                    : this.loading
                        ? this.renderSkeleton()
                        : this.renderEmpty())));
    }
    static get style() { return PopWeatherPanelStyle0(); }
};
__stencil_defineCustomElement(PopWeatherPanel, [774, "pop-weather-panel", {
        "data": [8],
        "heading": [1],
        "loading": [4],
        "showHeader": [4, "show-header"],
        "tab": [32]
    }]);
//# sourceMappingURL=weather-panel.js.map