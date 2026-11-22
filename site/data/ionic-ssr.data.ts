// The SSR benchmark (examples/ionic/bench-ssr.mjs writes site/data/benchmarks-ionic-ssr.json). Read as is; the page formats it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineLoader } from 'vitepress';

const file = fileURLToPath(new URL('./benchmarks-ionic-ssr.json', import.meta.url));

export default defineLoader({
  watch: [file],
  load() {
    const { equality, diagnostics, rows, ...rest } = JSON.parse(readFileSync(file, 'utf8'));
    return {
      ...rest,
      rows,
      equal: !!equality.stencil5VsStencilrs?.length && equality.stencil5VsStencilrs.every((c: any) => c.identical),
      comparisons: equality.stencil5VsStencilrs?.length ?? 0,
    };
  },
});

export declare const data: any;
