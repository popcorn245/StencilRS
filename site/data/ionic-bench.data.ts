// The Ionic benchmark (examples/ionic/bench.mjs writes site/data/benchmarks-ionic.json). Read as is; the page formats it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineLoader } from 'vitepress';

const file = fileURLToPath(new URL('./benchmarks-ionic.json', import.meta.url));

export default defineLoader({
  watch: [file],
  load() {
    return JSON.parse(readFileSync(file, 'utf8'));
  },
});

export declare const data: any;
