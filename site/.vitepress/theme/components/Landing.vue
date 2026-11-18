<script setup lang="ts">
import { withBase } from 'vitepress';

import { data } from '../../../data/site.data';

const { stats, derived: d } = data;

// The headline numbers: every value comes from the data files.
const headline = [
  { value: d.perFile, label: 'faster per file', note: `${d.perFileStencilrsMs} ms vs ${(Number(d.perFileStencilMs) / 1000).toFixed(1)} s for ${data.bench.transpile.files} files` },
  { value: d.viteBuild, label: 'faster production build', note: `ui-kit, ${data.bench.viteBuild.components} components through Vite` },
  { value: `${stats.parity.passed}/${stats.parity.total}`, label: 'fixtures identical to Stencil v5', note: 'metadata, diagnostics and code' },
  { value: `${stats.specs.passed}/${stats.specs.total}`, label: 'spec tests, both compilers', note: 'no test differs' },
];

const cold = [
  { label: 'Cold production build', before: d.coldBuildBefore, after: d.coldBuildAfter, ratio: d.coldBuildRatio },
  { label: 'Dev server, first response', before: d.devBefore, after: d.devAfter, ratio: d.devRatio },
];

const paths = [
  { title: 'Guide', text: 'Install it, add the Vite plugin, write components.', to: '/guide/introduction.html' },
  { title: 'The story', text: 'Parity, the fallbacks, the speed, the cold start.', to: '/story/' },
  { title: 'Components', text: 'Live components, compiled as the page loads.', to: '/components/' },
  { title: 'Benchmarks', text: 'The tables behind every speed claim.', to: '/benchmarks.html' },
];
</script>

<template>
  <div class="landing">
    <section class="hero">
      <p class="eyebrow">Rust · oxc · Vite 8</p>
      <h1>Stencil v5 components,<br />compiled by <span class="hl">Rust</span>.</h1>
      <p class="lede">
        stencilrs is a re-implementation of the part of the Stencil compiler that turns a component file into a
        custom element. Same output as Stencil v5, a fraction of the time, as a Vite plugin.
      </p>
      <div class="actions">
        <a class="btn btn-primary" :href="withBase('/guide/getting-started.html')">Get started</a>
        <a class="btn" :href="withBase('/story/')">Read the story</a>
        <a class="btn btn-ghost" :href="withBase('/benchmarks.html')">Benchmarks</a>
      </div>
    </section>

    <section class="stats" aria-label="Headline numbers">
      <div v-for="s in headline" :key="s.label" class="stat">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-note">{{ s.note }}</div>
      </div>
    </section>

    <section class="band">
      <h2>Ionic, built three ways</h2>
      <p>
        The same Ionic Framework source through Stencil 4, Stencil 5 and stencilrs. Lower is better in every chart.
      </p>
      <IonicHeadline />
    </section>

    <section class="band">
      <h2>Where it sits</h2>
      <p>
        Stencil's TypeScript transform layer is the slow part, so that is the part stencilrs replaces. The runtime and the
        output shape stay Stencil's.
      </p>
      <PipelineFlow />
    </section>

    <section class="band">
      <h2>Live, and compiled by stencilrs</h2>
      <p>
        These are real custom elements. Each was compiled by stencilrs, through the Vite plugin in this site's own
        config, when the page loaded: the docs site is itself a test.
      </p>
      <Demo caption="pop-counter, pop-press-button, pop-tone-chip, pop-toggle and pop-greeting, from the starter project">
        <div class="strip">
          <pop-counter label="Clicks" step="1"></pop-counter>
          <pop-press-button label="Press me"></pop-press-button>
          <pop-tone-chip></pop-tone-chip>
          <pop-toggle></pop-toggle>
          <pop-greeting name="stencilrs"></pop-greeting>
        </div>
      </Demo>
    </section>

    <section class="band">
      <h2>Fast from a cold start</h2>
      <p>A fresh process, nothing warmed up: where every real build and dev server starts.</p>
      <div class="cold">
        <div v-for="c in cold" :key="c.label" class="cold-row">
          <div class="cold-label">{{ c.label }}</div>
          <div class="cold-nums">
            <span class="cold-before">{{ c.before }}</span>
            <span class="cold-arrow" aria-hidden="true">→</span>
            <span class="cold-after">{{ c.after }}</span>
            <span class="cold-ratio">{{ c.ratio }}</span>
          </div>
        </div>
      </div>
      <p class="fine">
        ui-kit, before and after the cold-start work in
        <a href="https://github.com/popcorn245/StencilRS/pull/52" target="_blank" rel="noreferrer">PR #52</a>.
        <a :href="withBase('/story/')">How we got there</a>.
      </p>
    </section>

    <section class="band">
      <h2>Install</h2>
      <div class="language-sh vp-adaptive-theme"><pre><code>npm install --save-dev @popcorn245/stencilrs vite@8 \
  @stencil/core@5.0.0-beta.25 @stencil/unplugin@5.0.0-beta.25</code></pre></div>
      <div class="language-ts vp-adaptive-theme"><pre><code>import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [stencilrs()] });</code></pre></div>
    </section>

    <section class="paths">
      <a v-for="p in paths" :key="p.to" class="path" :href="withBase(p.to)">
        <b>{{ p.title }}</b>
        <span>{{ p.text }}</span>
      </a>
    </section>

    <p class="credit">
      Ionic Framework is our proving ground and test subject, credited as such. It is not our brand.
    </p>
  </div>
</template>
