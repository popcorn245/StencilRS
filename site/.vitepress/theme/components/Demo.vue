<script setup lang="ts">
// A live demo: the slot holds custom elements, compiled by stencilrs. It renders on the client
// only (the prerender has no custom element registry), with its footprint reserved meanwhile.
defineProps<{ caption?: string }>();
</script>

<template>
  <figure class="demo">
    <div class="demo-stage">
      <ClientOnly>
        <slot />
        <template #fallback><span class="demo-wait">Loading components…</span></template>
      </ClientOnly>
    </div>
    <figcaption v-if="caption">
      <span class="demo-dot" aria-hidden="true"></span>
      {{ caption }}
    </figcaption>
  </figure>
</template>
