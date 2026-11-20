<script setup lang="ts">
// The Ionic headline on the home page: three measures, drawn from the same data as the Benchmarks page.
import { withBase } from 'vitepress';

import { data } from '../../../data/charts.data';

const ids = ['ionic-cold-build', 'ionic-dev-start', 'ionic-per-file'];
const charts = ids.map((id) => data.charts[id]);
</script>

<template>
  <div class="ionic-headline" data-chart="ionic-headline">
    <div class="ih-grid">
      <BenchChart v-for="c in charts" :key="c.id" :chart="c" compact />
    </div>
    <p class="ih-foot">
      <span v-if="data.ionic.preview" class="ih-badge">Preview</span>
      Ionic Framework's core, 94 components. {{ data.ionic.meta }}.
      <a :href="withBase('/benchmarks.html#ionic-one-source-three-compilers')">Every measure, with ranges and tables</a>.
    </p>
  </div>
</template>

<style scoped>
.ih-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 14px; }
.ih-foot { margin: 12px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--vp-c-text-2); }
.ih-badge { display: inline-block; margin-right: 6px; padding: 0 7px; border-radius: 999px; font-size: 11px; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-border); }
</style>
