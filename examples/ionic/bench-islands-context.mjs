// What rendering each island inside its ancestors (`islands.context`, the default) costs on the server: the same island views with the option on
// and off, interleaved, two workers, DSD and scoped. Median ms of a whole page (renderIslands(...).html()), n = rounds, sequential requests.
//
//   npm run build:hydrate && node bench-islands-context.mjs [rounds=40]
import { join } from 'node:path';

import { stencilEngine } from '../../express.js';
import { HYDRATE, MODES, fmt, renderOptions, stats } from './spike/islands/lib.mjs';
import { writeViews } from './spike/islands/views.mjs';

const rounds = Number(process.argv[2] ?? 40);
const pages = ['list-50', 'kitchen-sink', 'app-menu', 'app-tabs'];
const dir = writeViews(pages);
for (const mode of ['dsd', 'scoped']) {
  const engines = { on: stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[mode]), islands: { cache: false } }), off: stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[mode]), islands: { cache: false, context: false } }) };
  await Promise.all(Object.values(engines).map((e) => e.ready));
  for (const page of pages) {
    const t = { on: [], off: [] };
    const failed = {};
    for (let i = 0; i < rounds + 3; i++) {
      for (const k of i % 2 ? ['on', 'off'] : ['off', 'on']) {
        const t0 = performance.now();
        try {
          await (await engines[k].renderIslands(join(dir, `${page}.html`))).html();
        } catch (e) {
          failed[k] = e.message.split('\n')[0].slice(0, 140);
          continue;
        }
        if (i >= 3) t[k].push(performance.now() - t0);
      }
    }
    console.log(`${mode.padEnd(6)} ${page.padEnd(12)} context on ${t.on.length ? fmt(stats(t.on)) : `fails: ${failed.on}`} ms   off ${t.off.length ? fmt(stats(t.off)) : `fails: ${failed.off}`}`);
  }
  await Promise.all(Object.values(engines).map((e) => e.close()));
}
