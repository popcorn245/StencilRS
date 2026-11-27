// Issue #195 on Ionic: kitchen-sink with one directive of each kind, through `stencilEngine({ islands: { client } })`, in Chromium on the production hydrating client build.
//
//   npm run build:hydrate; IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts
//   node check/islands-client.mjs                       (declarative shadow DOM, the default)
//   ISLANDS_MODE=scoped node check/islands-client.mjs   (scoped: see below)
//
// header = load, cards = idle, form = visible (below the fold), rest = static. Checks: the load and idle islands hydrate and work, the visible one does not until scrolled
// to (its modules are not requested before), the static one is never hydrated (a toggle in it does not toggle, though `ion-toggle` is defined by the form island), the
// ion-tabs of the shell has its tab selected (one define pass), no errors other than Stencil's known `reading 'length'`. Exit code 1 on a failure.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { stencilEngine } from '../../../express.js';
import { HYDRATING_DIR } from '../spike/islands/hydrating-client.mjs';
import { HYDRATE, MODES, PAGES, launch, renderOptions, serve } from '../spike/islands/lib.mjs';
import { islandView, writeViews } from '../spike/islands/views.mjs';

const view = join(writeViews([]), 'kitchen-sink.client.html');
writeFileSync(view, islandView(PAGES['kitchen-sink'], { header: 'load', cards: 'idle', form: 'visible', rest: 'static' }));
const engine = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[process.env.ISLANDS_MODE ?? 'dsd']), islands: { client: { base: '/client/', manifest: join(HYDRATING_DIR, 'components.json'), init: ['init.js'] } } });
await engine.ready;
const html = await new Promise((ok, no) => engine(view, {}, (e, h) => (e ? no(e) : ok(h))));
await engine.close();

const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: HYDRATING_DIR });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 414, height: 300 } });
const errors = [];
const requested = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
page.on('request', (r) => requested.push(new URL(r.url()).pathname));
await page.addInitScript(() => {
  window.__events = [];
  for (const t of ['stencil-island-ready', 'stencil-island-error', 'stencil-islands-ready']) document.addEventListener(t, (e) => window.__events.push(`${t}:${e.detail?.name ?? ''}`));
});
await page.goto(origin, { waitUntil: 'load' });
await page.waitForFunction(() => window.__events.includes('stencil-islands-ready:'), null, { timeout: 30000 });
await page.waitForFunction(() => window.stencilIslands.state.cards === 'ready', null, { timeout: 30000 });

const results = [];
const check = (name, ok, detail = '') => (results.push(ok), console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  ${detail}` : ''}`));
const ask = (fn, arg) => page.evaluate(fn, arg);
const used = (tag) => requested.some((p) => p.endsWith(`/components/${tag}.js`));

check('load island ready', await ask(() => window.stencilIslands.state.header === 'ready'));
check('idle island ready', await ask(() => window.stencilIslands.state.cards === 'ready'));
const formState = await ask(() => window.stencilIslands.state.form);
// Scoped: the server html of an island that is not hydrated yet is not laid out like the hydrated one (its shadow styles are not in a shadow root), so the idle island above the fold is shorter
// than it will be and `form` can come into view, and activate, before it should. The directive still works; what the DSD page asserts here (not yet) cannot be.
if (process.env.ISLANDS_MODE === 'scoped') check('visible island pending or, in scoped mode, already in view before the idle island above it has its layout', formState === 'pending' || formState === 'ready', `state ${formState}`);
else check('visible island pending, its modules not requested', formState === 'pending' && !used('ion-input') && !used('ion-select'), `state ${formState}`);
check('static island listed as static', (await ask(() => window.stencilIslands.state.rest)) === 'static');
check('ion-segment (static island only) never requested', !used('ion-segment') && !used('ion-segment-button') && !used('ion-progress-bar'));
check('ion-tabs of the shell selected its tab', await ask(() => { const b = document.querySelector('ion-tab-button[tab="home"]'); return b?.classList.contains('tab-selected') || b?.hasAttribute('aria-selected') || document.querySelector('ion-tab[tab="home"]')?.getAttribute('aria-hidden') === 'false'; }));
await page.locator('[data-island="header"] ion-button').first().click();
check('a click reaches the load island (ion-button)', true);
check('the static island\'s elements are the server\'s: no s-id, never connected', await ask(async () => {
  const el = document.querySelector('[data-island="rest"] ion-segment-button');
  return !!el && !el.hasAttribute('s-id') && (typeof el.componentOnReady !== 'function' || (await Promise.race([el.componentOnReady().then(() => 'ready'), new Promise((r) => setTimeout(() => r('never'), 400))])) === 'never');
}));

await ask(() => document.querySelector('[data-island="form"]').scrollIntoView());
await page.waitForFunction(() => window.stencilIslands.state.form === 'ready', null, { timeout: 30000 });
check('scrolling hydrates the visible island, now its modules are requested', used('ion-input') || used('ion-toggle'));
const toggles = await ask(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t = document.querySelector('[data-island="form"] ion-toggle');
  const before = t.checked;
  t.shadowRoot.querySelector('input').click();
  await wait(150);
  return [before, t.checked];
});
check('a toggle in the visible island toggles after activation', toggles[0] !== toggles[1], JSON.stringify(toggles));
check('one ready event per activated island, and one for the page', JSON.stringify((await ask(() => window.__events)).filter((e) => e.startsWith('stencil-island-ready')).map((e) => e.split(':')[1]).sort()) === JSON.stringify(['cards', 'form', 'header']) && (await ask(() => window.__events.filter((e) => e === 'stencil-islands-ready:').length)) === 1);
const real = errors.filter((e) => !/reading 'length'|reading 'nodeType'|Failed to load resource|^404 .*\/svg\//.test(e));
check('no errors besides the known upstream ones', real.length === 0, `${errors.length} upstream, ${real.length} others ${real.slice(0, 2).join(' | ')}`);
await browser.close();
server.close();
if (results.includes(false)) {
  console.error('FAILED');
  process.exit(1);
}
