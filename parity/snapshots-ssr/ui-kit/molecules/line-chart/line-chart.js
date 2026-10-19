import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { axisDomain, scaleX, scaleY, scaleStep, scaleVal, linePath, areaPath, vLinePath, vAreaPath, extendDomain, } from './chart-scale';
import PopLineChartStyle0 from "./ui-kit/molecules/line-chart/line-chart.css?tag=pop-line-chart&encapsulation=scoped";
/**
 * pop-line-chart — a self-contained, dependency-free inline-SVG chart for small
 * multi-series data (temp / humidity / precipitation), with an optional second
 * y-axis (e.g. % vs °F), shaded bands (night), x-axis markers (sunrise/sunset),
 * and a compact legend. Responsive via viewBox; theme via the series colors you
 * pass. Reusable across panels — pass different series/scope.
 *
 * Props accept either real arrays/objects (Stencil prop binding) OR JSON strings
 * (so it works from plain HTML / Storybook templates too).
 */
export class PopLineChart {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** Series to plot. Area series (kind:'area') render filled-from-baseline. */
    series = [];
    /** X-axis tick labels (subset shown to avoid crowding). */
    xLabels = [];
    /** Vertical markers (sunrise/sunset) at data indices. */
    markers = [];
    /** Shaded x-ranges (night) as index bounds. */
    bands = [];
    /** Horizontal reference lines at y-values (goal lines). Horizontal mode only. */
    refLines = [];
    /** Shaded y-VALUE ranges (e.g. a glucose normal band). Horizontal mode only. */
    rangeBands = [];
    /** Unit suffix for the left axis (e.g. "°"). */
    leftUnit = '';
    /** Unit suffix for the right axis (e.g. "%"). */
    rightUnit = '';
    /** Accessible title. */
    chartTitle = 'Chart';
    /**
     * Layout orientation:
     *  - 'horizontal' (default): index axis runs left→right, value axis bottom→top.
     *  - 'vertical': index axis runs top→bottom (one cell per data point, fixed
     *    `rowHeight`), value axis left→right. Built to sit beside an external list
     *    of the SAME row height so row i lines up with point i. The SVG's height is
     *    count*rowHeight; place it in a non-scaling, slim column and let the parent
     *    scroll it in lockstep with the list.
     */
    orientation = 'horizontal';
    /** Vertical mode: per-row height in px (match the list's row pitch). */
    rowHeight = 44;
    /**
     * Vertical mode: the viewBox WIDTH in px. Because the vertical chart uses
     * `preserveAspectRatio="none"`, the host should render the SVG at THIS same CSS
     * width (e.g. `flex: 0 0 150px`) so the x-axis is 1:1 and value-label text is
     * crisp (not horizontally stretched). Default 80 keeps the pre-existing slim
     * strip behaviour for callers that don't opt into labels. */
    vbWidth = 80;
    /**
     * Vertical mode: render per-point VALUE LABELS + point dots so the temp /
     * humidity readings are legible on their own (not just a line smear). The first
     * LINE series on the LEFT axis is labelled in the left gutter (°), the first on
     * the RIGHT axis in the right gutter (%). Additive — off by default. */
    showValueLabels = false;
    parse(v, fallback) {
        if (typeof v === 'string') {
            try {
                return JSON.parse(v);
            }
            catch {
                return fallback;
            }
        }
        return v ?? fallback;
    }
    render() {
        const series = this.parse(this.series, []);
        const xLabels = this.parse(this.xLabels, []);
        const markers = this.parse(this.markers, []);
        const bands = this.parse(this.bands, []);
        const refLines = this.parse(this.refLines, []);
        const rangeBands = this.parse(this.rangeBands, []);
        if (this.orientation === 'vertical')
            return this.renderVertical(series, bands, markers);
        // viewBox geometry (scales to container width via CSS).
        const W = 320;
        const H = 150;
        const padL = 26;
        const padR = 28;
        const padT = 10;
        const padB = 20;
        const xLeft = padL;
        const xRight = W - padR;
        const yTop = padT;
        const yBottom = H - padB;
        const count = Math.max(...series.map((s) => s.data.length), xLabels.length, 1);
        // Bar series read best from a 0 baseline; line/area axes use the padded data
        // domain, extended to also cover any goal lines / shaded value ranges so they
        // never clip. (Additive — vertical mode and the legacy line/area paths are
        // unchanged.)
        const onAxis = (a) => (s) => (s.axis ?? 'left') === a;
        const extrasFor = (a) => [
            ...refLines.filter(onAxis(a)).map((r) => r.value),
            ...rangeBands.filter(onAxis(a)).flatMap((b) => [b.from, b.to]),
        ];
        const domForAxis = (a) => {
            const hasBar = series.some((s) => onAxis(a)(s) && s.kind === 'bar');
            if (hasBar) {
                const vals = series
                    .filter((s) => onAxis(a)(s))
                    .flatMap((s) => s.data.filter((v) => v != null && !Number.isNaN(v)));
                return [0, Math.max(1, ...vals, ...extrasFor(a)) * 1.1];
            }
            return extendDomain(axisDomain(series, a), extrasFor(a));
        };
        const leftDom = domForAxis('left');
        const rightDom = domForAxis('right');
        const domFor = (s) => ((s.axis ?? 'left') === 'right' ? rightDom : leftDom);
        // Show ~5 x labels evenly to avoid crowding.
        const maxLabels = 5;
        const step = Math.max(1, Math.ceil(count / maxLabels));
        const hasData = series.some((s) => s.data.some((v) => v != null && !Number.isNaN(v)));
        return (h("div", { class: "plc" },
            h("svg", { class: "plc__svg", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": this.chartTitle, preserveAspectRatio: "none" },
                bands.map((b) => {
                    const x0 = scaleX(Math.max(0, b.from), count, xLeft, xRight);
                    const x1 = scaleX(Math.min(count - 1, b.to), count, xLeft, xRight);
                    return h("rect", { class: "plc__band", x: Math.min(x0, x1), y: yTop, width: Math.abs(x1 - x0), height: yBottom - yTop });
                }),
                rangeBands.map((b) => {
                    const dom = (b.axis ?? 'left') === 'right' ? rightDom : leftDom;
                    const yA = scaleY(b.to, dom, yTop, yBottom);
                    const yB = scaleY(b.from, dom, yTop, yBottom);
                    return (h("rect", { class: "plc__rangeband", x: xLeft, y: Math.min(yA, yB), width: xRight - xLeft, height: Math.abs(yB - yA), fill: b.color || 'var(--brand-blue, #3b82f6)', rx: 2 }));
                }),
                [0, 0.5, 1].map((t) => {
                    const y = yTop + t * (yBottom - yTop);
                    return h("line", { class: "plc__grid", x1: xLeft, y1: y, x2: xRight, y2: y });
                }),
                series.filter((s) => s.kind === 'area').map((s) => (h("path", { class: "plc__area", d: areaPath(s.data, domFor(s), xLeft, xRight, yTop, yBottom), fill: s.color }))),
                series.filter((s) => s.kind === 'bar').map((s) => {
                    const dom = domFor(s);
                    const n = Math.max(s.data.length, 1);
                    const slot = (xRight - xLeft) / n;
                    const barW = Math.max(2, slot * 0.6);
                    return s.data.map((v, i) => {
                        if (v == null || Number.isNaN(v))
                            return null;
                        const yv = scaleY(v, dom, yTop, yBottom);
                        const x = xLeft + i * slot + (slot - barW) / 2;
                        return h("rect", { class: "plc__bar", x: x, y: yv, width: barW, height: Math.max(0, yBottom - yv), rx: 2, fill: s.color });
                    });
                }),
                series.filter((s) => s.kind !== 'area' && s.kind !== 'bar').map((s) => (h("path", { class: "plc__line", d: linePath(s.data, domFor(s), xLeft, xRight, yTop, yBottom), stroke: s.color, fill: "none" }))),
                refLines.map((r) => {
                    const dom = (r.axis ?? 'left') === 'right' ? rightDom : leftDom;
                    const y = scaleY(r.value, dom, yTop, yBottom);
                    return (h("line", { class: { plc__refline: true, 'plc__refline--solid': r.dashed === false }, x1: xLeft, y1: y, x2: xRight, y2: y, stroke: r.color || 'var(--fit-goal, #d9820b)' }));
                }),
                markers.map((m) => {
                    const x = scaleX(m.index, count, xLeft, xRight);
                    return [
                        h("line", { class: "plc__marker", x1: x, y1: yTop, x2: x, y2: yBottom }),
                        h("text", { class: "plc__marker-label", x: x, y: yTop - 1, "text-anchor": "middle" }, m.icon === 'sunset' ? '☾' : '☀'),
                    ];
                }),
                hasData && [1, 0.5, 0].map((t) => {
                    const val = leftDom[0] + t * (leftDom[1] - leftDom[0]);
                    const y = yTop + (1 - t) * (yBottom - yTop);
                    return h("text", { class: "plc__axis plc__axis--l", x: xLeft - 3, y: y + 3, "text-anchor": "end" },
                        Math.round(val),
                        this.leftUnit);
                }),
                hasData && series.some((s) => (s.axis ?? 'left') === 'right') && [1, 0].map((t) => {
                    const val = rightDom[0] + t * (rightDom[1] - rightDom[0]);
                    const y = yTop + (1 - t) * (yBottom - yTop);
                    return h("text", { class: "plc__axis plc__axis--r", x: xRight + 3, y: y + 3, "text-anchor": "start" },
                        Math.round(val),
                        this.rightUnit);
                }),
                xLabels.map((lbl, i) => {
                    if (i % step !== 0 && i !== count - 1)
                        return null;
                    const x = scaleX(i, count, xLeft, xRight);
                    return h("text", { class: "plc__xlabel", x: x, y: H - 6, "text-anchor": "middle" }, lbl);
                })),
            h("div", { class: "plc__legend" }, series.map((s) => (h("span", { class: "plc__legend-item" },
                h("span", { class: "plc__legend-swatch", style: { background: s.color }, "aria-hidden": "true" }),
                s.label))))));
    }
    /**
     * Vertical orientation: a slim strip where the index axis runs top→bottom (one
     * `rowHeight` cell per data point) and the value axis runs left→right. Height =
     * count*rowHeight so it lines up row-for-row with an external list of the same
     * pitch; the parent scrolls it in lockstep. No legend here (the caller renders
     * a shared legend above the two-column area).
     */
    renderVertical(series, bands, markers) {
        const count = Math.max(...series.map((s) => s.data.length), 1);
        const labels = this.showValueLabels;
        const W = this.vbWidth; // viewBox width (px); host renders the SVG at this width.
        // With value labels on, reserve left/right gutters so the plotted band never
        // sits under the numbers; otherwise keep the slim 6px pad (legacy behaviour).
        // The left gutter is a touch wider so the left-axis value labels sit INSIDE the
        // chart (away from an adjacent list's right edge) — avoids a "0%68°" collision
        // with a neighbouring row list at narrow (dock) widths.
        const gutterL = labels ? 32 : 6;
        const gutterR = labels ? 30 : 6;
        const xLeft = gutterL;
        const xRight = W - gutterR;
        const step = this.rowHeight;
        const H = count * step;
        const leftDom = axisDomain(series, 'left');
        const rightDom = axisDomain(series, 'right');
        const domFor = (s) => ((s.axis ?? 'left') === 'right' ? rightDom : leftDom);
        const lineSeries = series.filter((s) => s.kind !== 'area');
        // The one series we label on each side: the first LINE series per axis (temp/hi
        // on the left, humidity on the right) — labelling every series would collide.
        const leftLabel = lineSeries.find((s) => (s.axis ?? 'left') === 'left');
        const rightLabel = lineSeries.find((s) => (s.axis ?? 'left') === 'right');
        const pointDots = (s) => s.data.map((v, i) => v == null || Number.isNaN(v) ? null : (h("circle", { class: "plc__dot", cx: scaleVal(v, domFor(s), xLeft, xRight), cy: scaleStep(i, step, 0), r: 2, fill: s.color })));
        const valueLabels = (s, side) => {
            if (!s)
                return null;
            const unit = side === 'left' ? this.leftUnit : this.rightUnit;
            const x = side === 'left' ? xLeft - 4 : xRight + 4;
            const anchor = side === 'left' ? 'end' : 'start';
            return s.data.map((v, i) => v == null || Number.isNaN(v) ? null : (h("text", { class: `plc__vval plc__vval--${side}`, x: x, y: scaleStep(i, step, 0) + 3, "text-anchor": anchor, fill: s.color },
                Math.round(v),
                unit)));
        };
        return (h("div", { class: "plc plc--vertical" },
            h("svg", { class: "plc__svg plc__svg--vertical", viewBox: `0 0 ${W} ${H}`, style: { height: `${H}px` }, role: "img", "aria-label": this.chartTitle, preserveAspectRatio: "none" },
                bands.map((b) => {
                    const y0 = scaleStep(Math.max(0, b.from), step, 0) - step / 2;
                    const y1 = scaleStep(Math.min(count - 1, b.to), step, 0) + step / 2;
                    return h("rect", { class: "plc__band", x: 0, y: Math.min(y0, y1), width: W, height: Math.abs(y1 - y0) });
                }),
                [0, 0.5, 1].map((t) => {
                    const x = xLeft + t * (xRight - xLeft);
                    return h("line", { class: "plc__grid", x1: x, y1: 0, x2: x, y2: H });
                }),
                markers.map((m) => {
                    const y = scaleStep(Math.max(0, Math.min(count - 1, m.index)), step, 0);
                    return [
                        h("line", { class: "plc__marker", x1: 0, y1: y, x2: W, y2: y }),
                        h("text", { class: "plc__marker-label", x: W - 2, y: y - 2, "text-anchor": "end" }, m.icon === 'sunset' ? '☾' : '☀'),
                    ];
                }),
                series.filter((s) => s.kind === 'area').map((s) => (h("path", { class: "plc__area", d: vAreaPath(s.data, domFor(s), xLeft, xRight, 0, step), fill: s.color }))),
                lineSeries.map((s) => (h("path", { class: "plc__line", d: vLinePath(s.data, domFor(s), xLeft, xRight, 0, step), stroke: s.color, fill: "none" }))),
                labels && lineSeries.map((s) => pointDots(s)),
                labels && valueLabels(leftLabel, 'left'),
                labels && valueLabels(rightLabel, 'right'))));
    }
    static get style() { return PopLineChartStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-line-chart",
        "$members$": {
            "series": [1],
            "xLabels": [1, "x-labels"],
            "markers": [1],
            "bands": [1],
            "refLines": [1, "ref-lines"],
            "rangeBands": [1, "range-bands"],
            "leftUnit": [1, "left-unit"],
            "rightUnit": [1, "right-unit"],
            "chartTitle": [1, "chart-title"],
            "orientation": [1],
            "rowHeight": [2, "row-height"],
            "vbWidth": [2, "vb-width"],
            "showValueLabels": [4, "show-value-labels"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=line-chart.js.map