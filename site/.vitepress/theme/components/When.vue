<script setup lang="ts">
// A timeline entry's date and links: pull requests and issues on GitHub.
defineProps<{ when: string; prs?: number[]; issues?: number[]; release?: string }>();
const gh = 'https://github.com/popcorn245/StencilRS';
</script>

<template>
  <p class="when">
    <span class="when-date">{{ when }}</span>
    <a v-if="release" class="chip chip-release" :href="`${gh}/releases/tag/${release}`" target="_blank" rel="noreferrer">{{ release }}</a>
    <a v-for="n in issues" :key="'i' + n" class="chip" :href="`${gh}/issues/${n}`" target="_blank" rel="noreferrer">#{{ n }}</a>
    <a v-for="n in prs" :key="'p' + n" class="chip chip-pr" :href="`${gh}/pull/${n}`" target="_blank" rel="noreferrer">PR #{{ n }}</a>
  </p>
</template>
