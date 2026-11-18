<script setup lang="ts">
// One benchmark measure as horizontal bars, drawn as inline SVG while the page is built (no chart library, no
// client code): the median is the bar, the min to max range is the whisker, the value is written at the end of the
// bar. Colour is the compiler's, the same in every chart (style.css, --bc-*). The data table is in the figure.
import { computed } from 'vue';

import { format, type Chart } from '../../../data/charts';

const props = defineProps<{ chart: Chart; compact?: boolean }>();

const W = 360;
const PLOT = 235; // width of the longest bar or whisker; the value label takes the rest
const ROW = 46;
const BAR = 14;
const TOP = 4;

const rows = computed(() => {
  const c = props.chart;
  const top = Math.max(...c.bars.map((b) => b.max ?? b.median));
  const k = PLOT / top;
  return c.bars.map((b, i) => {
    const y = TOP + i * ROW;
    const w = Math.max(b.median * k, 3);
    const lo = (b.min ?? b.median) * k;
    const hi = (b.max ?? b.median) * k;
    const r = Math.min(4, w / 2);
    // the data end is rounded, the baseline end is square
    const path = `M0,${y + 18}H${w - r}Q${w},${y + 18} ${w},${y + 18 + r}V${y + 18 + BAR - r}Q${w},${y + 18 + BAR} ${w - r},${y + 18 + BAR}H0Z`;
    return {
      b, y, path, w, lo, hi, whisker: b.min != null && b.max != null && hi - lo >= 0.5,
      value: format(c.display, b.median),
      range: b.min != null && b.max != null ? `${format(c.display, b.min)} to ${format(c.display, b.max)}` : '',
      wd: `M${lo.toFixed(1)},${y + 20}V${y + 18 + BAR - 2}M${lo.toFixed(1)},${y + 18 + BAR / 2}H${hi.toFixed(1)}M${hi.toFixed(1)},${y + 20}V${y + 18 + BAR - 2}`,
      labelX: Math.max(w, hi) + 8,
    };
  });
});
const H = computed(() => TOP + props.chart.bars.length * ROW + 14);
const axis = computed(() => (props.chart.display === 's' ? 'seconds' : props.chart.display === 'ms' ? 'milliseconds' : 'MiB'));
const hasRange = computed(() => props.chart.bars.some((b) => b.min != null));
const summary = computed(() => {
  const c = props.chart;
  const parts = rows.value.map((r) => `${r.b.label} ${r.value}${r.range ? ` (${r.range})` : ''}`);
  return `${c.title}, ${axis.value}, lower is better. ${parts.join('; ')}. ${c.headline}.`;
});
</script>

<template>
  <figure class="bench-chart" :class="{ compact }" :data-chart="chart.id" :data-slower="chart.note ? '' : undefined">
    <figcaption class="bc-head">
      <span class="bc-title">{{ chart.title }}</span>
      <span class="bc-headline">{{ chart.headline }}</span>
    </figcaption>
    <svg class="bc-svg" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-labelledby="`${chart.id}-t ${chart.id}-d`" xmlns="http://www.w3.org/2000/svg">
      <title :id="`${chart.id}-t`">{{ chart.title }}: {{ chart.headline }}</title>
      <desc :id="`${chart.id}-d`">{{ summary }}</desc>
      <line class="bc-axis" x1="0.5" :y1="TOP + 14" x2="0.5" :y2="TOP + (chart.bars.length - 1) * ROW + 18 + BAR" />
      <g v-for="r in rows" :key="r.b.id" :class="`bc-row bc-${r.b.id}`">
        <text class="bc-name" x="0" :y="r.y + 12">{{ r.b.label }}</text>
        <path class="bc-bar" :d="r.path" />
        <g v-if="r.whisker" class="bc-whisker">
          <path class="halo" :d="r.wd" />
          <path class="ink" :d="r.wd" />
        </g>
        <text class="bc-value" :x="r.labelX" :y="r.y + 18 + BAR - 2">{{ r.value }}</text>
      </g>
      <text class="bc-unit" x="0" :y="H - 2">← lower is better · {{ axis }}{{ hasRange ? ' · whisker: min to max' : '' }}</text>
    </svg>
    <div v-if="$slots.default" class="bc-note"><slot /></div>
    <p v-if="!compact" class="bc-meta">
      <span v-if="chart.status" class="bc-badge">{{ chart.status }}</span>
      {{ chart.meta }}
    </p>
    <details v-if="!compact" class="bc-details">
      <summary>Data table</summary>
      <p class="bc-what">{{ chart.what }}</p>
      <table>
        <thead>
          <tr><th>Row</th><th>Median</th><th v-if="hasRange">Min</th><th v-if="hasRange">Max</th><th v-if="hasRange">Runs</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.b.id">
            <td>{{ r.b.full }}</td>
            <td>{{ r.value }}</td>
            <template v-if="hasRange">
              <td>{{ r.b.min != null ? format(chart.display, r.b.min) : 'n/a' }}</td>
              <td>{{ r.b.max != null ? format(chart.display, r.b.max) : 'n/a' }}</td>
              <td>{{ r.b.n ?? 'n/a' }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.bench-chart { margin: 0; padding: 14px 16px 12px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 10px; min-width: 0; }
.bc-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px; }
.bc-title { font-size: 15px; font-weight: 650; color: var(--vp-c-text-1); line-height: 1.3; }
.bc-headline { font-size: 13px; color: var(--vp-c-text-2); line-height: 1.4; }
.bc-svg { display: block; width: 100%; height: auto; overflow: visible; }
.bc-axis { stroke: var(--vp-c-border); stroke-width: 1; }
.bc-name { font-size: 13.5px; fill: var(--vp-c-text-2); font-family: var(--vp-font-family-base); }
.bc-stencilrs .bc-name { fill: var(--vp-c-text-1); font-weight: 650; }
.bc-value { font-size: 14px; fill: var(--vp-c-text-1); font-weight: 650; font-family: var(--pop-mono); font-variant-numeric: tabular-nums; }
.bc-stencilrs .bc-bar { fill: var(--bc-stencilrs); }
.bc-stencil5 .bc-bar { fill: var(--bc-stencil5); }
.bc-stencil4 .bc-bar { fill: var(--bc-stencil4); }
.bc-whisker path { fill: none; stroke-linecap: butt; }
.bc-whisker .ink { stroke: var(--vp-c-text-1); stroke-width: 1.5; }
/* the whisker crosses a bar of any colour: a surface-coloured halo keeps it readable on all of them */
.bc-whisker .halo { stroke: var(--vp-c-bg); stroke-width: 4; }
.bc-unit { font-size: 12px; fill: var(--vp-c-text-3); font-family: var(--vp-font-family-base); }
.bc-note { margin-top: 8px; padding: 8px 10px; font-size: 12.5px; line-height: 1.5; color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); border-left: 3px solid var(--vp-c-text-3); border-radius: 0 6px 6px 0; }
.bc-note :deep(p) { margin: 0; }
.bc-meta { margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: var(--vp-c-text-2); }
.bc-badge { display: inline-block; margin-right: 6px; padding: 0 7px; border-radius: 999px; font-size: 11px; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-border); }
.bc-details { margin-top: 8px; font-size: 13px; }
.bc-details summary { cursor: pointer; color: var(--vp-c-text-2); }
.bc-what { margin: 6px 0 !important; font-size: 12.5px; line-height: 1.5; color: var(--vp-c-text-2); }
.bc-details table { display: table; width: 100%; margin: 4px 0 0; font-size: 12.5px; }
.bc-details th, .bc-details td { padding: 4px 8px; font-variant-numeric: tabular-nums; }
.bc-details td:not(:first-child), .bc-details th:not(:first-child) { text-align: right; white-space: nowrap; }
.compact { padding: 12px 14px 8px; }
</style>
