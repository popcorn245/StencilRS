// Islands in Ionic app layouts (spike/islands/lib.mjs `app-menu`, `app-tabs`): the client directives against every island `load`, on the production
// hydrating client build, interleaved in Chromium at a phone viewport. Each island is rendered inside its ancestors (`islands.context`, the default).
//
//   npm run build:hydrate
//   IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts
//   node bench-islands-apps.mjs [rounds=15] [dsd|scoped]
//
// Variants per page: `all-load` (every island load) and `directives` (DIRECTIVES below). Reported, medians (min-max, n): script time (CDP ScriptDuration),
// ready (ms from the boot's start until the shell and the load islands are ready), JS requested (files, bytes as transferred). After the numbers, each
// `directives` page is used once: app-tabs opens the Settings tab (its island is `visible`, so it activates when the tab shows) and toggles a setting;
// app-menu waits for the `idle` menu and opens it from the header's menu button.
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

import { stencilEngine } from '../../express.js';
import { HYDRATING_DIR } from './spike/islands/hydrating-client.mjs';
import { HYDRATE, MODES, PAGES, fmt, launch, renderOptions, serve, stats } from './spike/islands/lib.mjs';
import { islandView, writeViews } from './spike/islands/views.mjs';

const rounds = Number(process.argv[2] ?? 15);
const mode = process.argv[3] ?? 'dsd';
export const DIRECTIVES = {
  'app-menu': { menu: 'idle', header: 'load', hero: 'load', feed: 'visible', footer: 'static' },
  'app-tabs': { home: 'load', search: 'visible', settings: 'visible' },
};
const dir = writeViews([]);
const engine = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[mode]), islands: { client: { base: '/client/', manifest: join(HYDRATING_DIR, 'components.json'), init: ['init.js'] } } });
await engine.ready;
const render = (file) => new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));
const browser = await launch();
let failed = false;
for (const pageName of Object.keys(DIRECTIVES)) {
  const variants = {};
  for (const [v, client] of [['all-load', {}], ['directives', DIRECTIVES[pageName]]]) {
    const file = join(dir, `${pageName}.${v}.html`);
    writeFileSync(file, islandView(PAGES[pageName], client));
    variants[v] = await render(file);
  }
  const names = Object.keys(variants);
  const { server, origin } = await serve(Object.fromEntries(names.map((v) => [`/p/${v}`, (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(variants[v])])), { clientDir: HYDRATING_DIR });
  const open = async (v) => {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 800 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Performance.enable');
    const scripts = new Map();
    const sizes = new Map();
    cdp.on('Network.responseReceived', (e) => e.type === 'Script' && scripts.set(e.requestId, e.response.url));
    cdp.on('Network.loadingFinished', (e) => scripts.has(e.requestId) && sizes.set(e.requestId, e.encodedDataLength));
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await page.addInitScript(() => document.addEventListener('stencil-islands-ready', (e) => (window.__ready = e.detail.ms)));
    await page.goto(`${origin}/p/${v}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready !== undefined, null, { timeout: 20000 });
    return { ctx, page, cdp, scripts, sizes, errors };
  };
  const acc = Object.fromEntries(names.map((v) => [v, { script: [], ready: [], files: 0, bytes: 0 }]));
  for (let i = 0; i < rounds + 1; i++) {
    for (const v of names.map((_, k) => names[(k + i) % names.length])) {
      const { ctx, page, cdp, scripts, sizes } = await open(v);
      await page.waitForTimeout(300); // an idle island that activates at once is counted: it is part of the load
      const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      if (i > 0) {
        const a = acc[v];
        a.script.push(m.ScriptDuration * 1000);
        a.ready.push(await page.evaluate(() => window.__ready));
        a.files = scripts.size;
        a.bytes = [...sizes.values()].reduce((s, b) => s + b, 0);
      }
      await ctx.close();
    }
  }
  console.log(`\n${pageName} (${mode}, ${rounds} interleaved rounds, 414x800); directives: ${JSON.stringify(DIRECTIVES[pageName])}`);
  for (const v of names) {
    const a = acc[v];
    console.log(`  ${v.padEnd(11)} script ${fmt(stats(a.script), 0)} ms  ready ${fmt(stats(a.ready), 0)} ms  js ${a.files} files ${(a.bytes / 1024).toFixed(0)} KB`);
  }
  // Use the page once with the directives.
  const { ctx, page, scripts, errors } = await open('directives');
  const before = scripts.size;
  let use;
  try {
    if (pageName === 'app-tabs') {
      const pending = await page.evaluate(() => window.stencilIslands.state.settings);
      await page.click('ion-tab-button[tab="settings"]');
      await page.waitForFunction(() => window.stencilIslands.state.settings === 'ready', null, { timeout: 10000 });
      const t = page.locator('ion-tab[tab="settings"] ion-toggle');
      const was = await t.evaluate((e) => e.checked);
      await t.click();
      const now = await t.evaluate((e) => e.checked);
      use = { settingsBefore: pending, settingsAfter: 'ready', toggled: was !== now, filesOnTabOpen: scripts.size - before };
      if (pending === 'ready' || was === now) failed = true;
    } else {
      await page.waitForFunction(() => window.stencilIslands.state.menu === 'ready', null, { timeout: 10000 });
      await page.click('ion-menu-button');
      await page.waitForFunction(() => document.querySelector('ion-menu').classList.contains('show-menu'), null, { timeout: 5000 });
      const footer = await page.evaluate(() => window.stencilIslands.state.footer);
      use = { menuOpened: true, footer };
      if (footer !== 'static') failed = true;
    }
  } catch (e) {
    use = { error: e.message.split('\n')[0] };
    failed = true;
  }
  console.log(`  used once: ${JSON.stringify(use)}${errors.length ? `  page errors: ${errors.join('; ')}` : ''}`);
  await ctx.close();
  server.close();
}
await browser.close();
await engine.close();
if (failed) {
  console.error('FAILED: a deferred island did not activate or work when used');
  process.exitCode = 1;
}
