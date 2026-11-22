// Child process of bench-ssr.mjs, the cold-start step (issue #141): one fresh process starts stencilEngine on a hydrate app
// and serves its first two requests, so what a restart costs a user is measured, not a warmed-up renderer.
//   node ssr-bench/cold.mjs <hydrate.js> <cache|none> <warmup: none|html|list3>
//
//   readyMs      engine created -> `engine.ready` (with no warm-up that is nothing: the app loads on the first render)
//   fragmentMs   the first render, the `fragment` page, through the engine (includes the app's load when `ready` did not)
//   list50Ms     the next render, `list-50`: a different page than the warm-up and the first one
//   firstResponseMs  readyMs + fragmentMs: the time from start to the first response, the number to compare across variants
// `cache` is a directory for Node's compile cache (the caller primes it with one untimed run); `none` opts out.
// Warm-ups: `html` a small document of a few components; `list3` the list-50 page itself, 3 times (what the issue's first
// list-50 render needs: a warm-up shaped like the traffic).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { stencilEngine } from '../../../express.js';
import { PAGES, renderOptions } from '../ssr-pages.mjs';

const [file, cache, warmupKind] = process.argv.slice(2);
const SMALL = '<ion-app><ion-content><ion-list><ion-item><ion-label>Warm</ion-label><ion-toggle></ion-toggle></ion-item></ion-list></ion-content></ion-app>';
const warmup = { none: false, html: [SMALL], list3: { views: [PAGES['list-50']], times: 3 } }[warmupKind];
if (warmup === undefined) throw new Error(`unknown warm-up ${warmupKind}`);

const views = mkdtempSync(join(tmpdir(), 'ssr-cold-'));
for (const p of ['fragment', 'list-50']) writeFileSync(join(views, `${p}.html`), PAGES[p]);
const render = (engine, page) =>
  new Promise((ok, fail) => {
    const t = performance.now();
    engine(join(views, `${page}.html`), { cache: true }, (err) => (err ? fail(err) : ok(performance.now() - t)));
  });

const t0 = performance.now();
const engine = stencilEngine({ hydrate: file, renderOptions: renderOptions('declarative-shadow-dom'), compileCache: cache === 'none' ? false : cache, warmup, onDiagnostic: () => {} });
await engine.ready;
const readyMs = performance.now() - t0;
const fragmentMs = await render(engine, 'fragment');
const list50Ms = await render(engine, 'list-50');
console.log(JSON.stringify({ readyMs, fragmentMs, list50Ms, firstResponseMs: readyMs + fragmentMs }));
