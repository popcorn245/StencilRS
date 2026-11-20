<script setup lang="ts">
// The Usage section of an Ionic component page: a mode toggle, then each demo as live elements
// (compiled by stencilrs, loaded on demand) above the markup that makes them.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { demosFor } from '../../ionic/demos';

const props = defineProps<{ name: string }>();
const demos = computed(() => demosFor(props.name));

type Mode = 'ios' | 'md';
const mode = ref<Mode>('md');
const failed = ref('');
const stages = ref<HTMLElement[]>([]);
const nonce = ref(0);
let runtime: typeof import('../../ionic/runtime') | undefined;

const modeKey = 'stencilrs-ionic-mode';
const read = (): Mode => {
  try {
    const m = localStorage.getItem(modeKey);
    if (m === 'ios' || m === 'md') return m;
  } catch {}
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'ios' : 'md';
};

async function render() {
  if (!runtime) return;
  const run = ++nonce.value;
  try {
    runtime.applyMode(mode.value);
    for (const [i, demo] of demos.value.entries()) {
      const stage = stages.value[i];
      if (!stage || demo.live === false) continue;
      const tags = runtime.tagsIn(demo.html);
      await runtime.loadTags(tags, demo.needs ?? []);
      if (run !== nonce.value) return;
      stage.setAttribute('mode', mode.value);
      stage.innerHTML = demo.html;
      for (const el of stage.querySelectorAll('*')) if (el.localName.startsWith('ion-')) el.setAttribute('mode', mode.value);
      if (demo.js) new Function('root', demo.js)(stage);
    }
  } catch (e) {
    failed.value = String((e as Error)?.message ?? e);
    console.error(e);
  }
}

function pick(m: Mode) {
  mode.value = m;
  try { localStorage.setItem(modeKey, m); } catch {}
}

onMounted(async () => {
  mode.value = read();
  runtime = await (import.meta.env.SSR ? Promise.resolve(undefined) : import('../../ionic/runtime'));
  if (!runtime) return;
  await runtime.setupIonic(mode.value);
  await nextTick();
  await render();
  document.documentElement.classList.add('ionic-ready');
});
watch(mode, () => render());
onBeforeUnmount(() => {
  nonce.value++;
  // overlays move to the body when they open: take any that are left
  for (const el of document.body.querySelectorAll(':scope > ion-modal, :scope > ion-popover, :scope > ion-toast, :scope > ion-alert, :scope > ion-action-sheet, :scope > ion-loading')) el.remove();
});
</script>

<template>
  <div class="ion-usage">
    <div class="ion-modebar" role="group" aria-label="Ionic mode">
      <span class="ion-modebar-label">Mode</span>
      <button type="button" :class="{ on: mode === 'ios' }" :aria-pressed="mode === 'ios'" @click="pick('ios')">iOS</button>
      <button type="button" :class="{ on: mode === 'md' }" :aria-pressed="mode === 'md'" @click="pick('md')">MD</button>
      <span class="ion-modebar-note">The demos are live <code>ion-*</code> elements, compiled by stencilrs.</span>
    </div>
    <p v-if="failed" class="ion-error">A demo failed to load: {{ failed }}</p>
    <section v-for="(demo, i) in demos" :key="demo.title" class="ion-demo">
      <h3 :id="'demo-' + i">{{ demo.title }}</h3>
      <div v-if="demo.live === false" class="ion-stage ion-stage-off">This component renders nothing by itself; the markup is below.</div>
      <div
        v-else
        :ref="(el) => { if (el) stages[i] = el as HTMLElement }"
        class="ion-stage"
        :class="{ framed: demo.frame }"
        :style="demo.frame ? { height: demo.frame + 'px' } : undefined"
      ></div>
      <details class="ion-code" :open="demo.live === false">
        <summary>Code</summary>
        <pre><code>{{ demo.html }}</code></pre>
        <template v-if="demo.js"><p class="ion-code-note">And, in script:</p><pre><code>{{ demo.js }}</code></pre></template>
      </details>
    </section>
  </div>
</template>

<style scoped>
.ion-modebar { display: flex; align-items: center; gap: 6px; margin: 12px 0 8px; flex-wrap: wrap; }
.ion-modebar-label { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--vp-c-text-2); margin-right: 4px; }
.ion-modebar button { border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); border-radius: 999px; padding: 4px 14px; font-size: 13px; cursor: pointer; }
.ion-modebar button.on { background: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); color: #fff; }
.ion-modebar-note { font-size: 12px; color: var(--vp-c-text-2); margin-left: 8px; }
.ion-demo h3 { margin: 24px 0 8px; font-size: 16px; }
.ion-stage {
  background: #fff; color: #000; border: 1px solid var(--vp-c-divider); border-radius: 8px;
  padding: 16px; font-family: var(--ion-font-family, inherit); overflow: auto; min-height: 56px;
  --ion-safe-area-top: 0px; --ion-safe-area-bottom: 0px;
}
.ion-stage.framed { position: relative; overflow: hidden; padding: 0; contain: layout; }
.ion-stage-off { background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); font-size: 13px; font-style: italic; }
.ion-code { margin-top: 6px; }
.ion-code summary { cursor: pointer; font-size: 13px; color: var(--vp-c-text-2); }
.ion-code pre { margin: 6px 0; padding: 12px 16px; border-radius: 8px; background: var(--vp-code-block-bg); overflow-x: auto; font-size: 13px; line-height: 1.5; }
.ion-code-note { margin: 6px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
.ion-error { color: var(--vp-c-danger-1); font-size: 13px; }
</style>
