// The Components index: the section list and the numbers, from the generated data (scripts/components.mjs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineLoader } from 'vitepress';

const apiFile = fileURLToPath(new URL('./ionic-api.json', import.meta.url));
const diffFile = fileURLToPath(new URL('./ionic-api-diff.json', import.meta.url));

export default defineLoader({
  watch: [apiFile, diffFile],
  load() {
    const api = JSON.parse(readFileSync(apiFile, 'utf8'));
    const diff = JSON.parse(readFileSync(diffFile, 'utf8'));
    return {
      source: api.source,
      stats: api.stats,
      groups: api.groups,
      diff: { differences: diff.differences, componentsWithDifferences: diff.componentsWithDifferences },
    };
  },
});

export declare const data: {
  source: { version: string };
  stats: { components: number; properties: number; events: number; methods: number; fallbacks: number };
  groups: { name: string; tags: string[] }[];
  diff: { differences: number; componentsWithDifferences: number };
};
