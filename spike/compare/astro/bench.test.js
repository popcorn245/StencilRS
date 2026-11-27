// Astro container API: renders the 500-card page in a vitest worker (Astro compiles .astro through Vite).
// Writes the timings (ms, warm) and the html to $OUT as JSON; bench-all.mjs reads it.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import Page from './src/components/Page.astro';

test('astro container renderToString', async () => {
  const container = await AstroContainer.create();
  const t0 = performance.now();
  const html = await container.renderToString(Page);
  const cold = performance.now() - t0;
  for (let i = 0; i < 5; i++) await container.renderToString(Page);
  const times = [];
  for (let i = 0; i < Number(process.env.N ?? 40); i++) {
    const s = performance.now();
    await container.renderToString(Page);
    times.push(performance.now() - s);
  }
  writeFileSync(process.env.OUT ?? 'astro-result.json', JSON.stringify({ cold, times, bytes: html.length, html }));
}, 120000);
