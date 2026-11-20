<script setup lang="ts">
// The 1200x630 card behind og:image (scripts/snapshots.mjs photographs it into public/img/og.png). Its numbers are
// the Ionic headline, computed from the benchmark data like every chart.
import { data } from '../../../data/charts.data';

const ratio = (id: string) => {
  const b = data.charts[id].bars;
  const r = b.find((x) => x.id === 'stencil5')!.median / b.find((x) => x.id === 'stencilrs')!.median;
  return r >= 10 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`;
};
const stats = [
  { v: ratio('ionic-cold-build'), l: 'faster cold build' },
  { v: ratio('ionic-dev-start'), l: 'faster dev server start' },
  { v: ratio('ionic-per-file'), l: 'faster per file' },
];
</script>

<template>
  <div class="social-card">
    <div class="sc-top">
      <span class="sc-brand">stencilrs</span>
      <span class="sc-tag">Rust · oxc · Vite 8</span>
    </div>
    <h1>Stencil v5 components,<br />compiled by <em>Rust</em>.</h1>
    <div class="sc-stats">
      <div v-for="s in stats" :key="s.l" class="sc-stat"><b>{{ s.v }}</b><span>{{ s.l }}</span></div>
    </div>
    <p class="sc-foot">
      Ionic core, 94 components, vs StencilJS v5{{ data.ionic.preview ? ' · preview numbers' : '' }}
      <span class="sc-url">popcorn245.github.io/StencilRS</span>
    </p>
  </div>
</template>

<style scoped>
.social-card {
  width: 1200px; height: 630px; box-sizing: border-box; padding: 64px 72px; display: flex; flex-direction: column;
  background: #fcfaf6; color: #1c1917; border-left: 18px solid #c2410c;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
.sc-top { display: flex; align-items: baseline; gap: 20px; }
.sc-brand { font-family: ui-serif, 'Iowan Old Style', Georgia, serif; font-size: 40px; font-weight: 700; color: #c2410c; }
.sc-tag { font-size: 24px; color: #57534e; }
h1 { margin: 28px 0 0; font-family: ui-serif, 'Iowan Old Style', Georgia, serif; font-size: 68px; line-height: 1.08; font-weight: 700; letter-spacing: -0.01em; border: 0; padding: 0; }
h1 em { font-style: normal; color: #c2410c; }
.sc-stats { display: flex; gap: 64px; margin-top: auto; }
.sc-stat { display: flex; flex-direction: column; }
.sc-stat b { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 80px; line-height: 1; color: #c2410c; }
.sc-stat span { margin-top: 8px; font-size: 26px; color: #57534e; }
.sc-foot { margin: 32px 0 0; display: flex; justify-content: space-between; gap: 24px; white-space: nowrap; font-size: 21px; color: #57534e; }
.sc-url { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; color: #1c1917; }
</style>
