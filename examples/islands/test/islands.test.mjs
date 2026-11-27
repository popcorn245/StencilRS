// The example end to end: the response starts long before the slow island is done, the islands arrive in place, the counter hydrates, the static
// island loads no code. npm test   (after `npm run build`)
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createApp } from '../server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const built = existsSync(join(here, '../dist/hydrate/index.js')) && existsSync(join(here, '../dist/client/components.json'));
const opts = { skip: built ? false : 'run `npm run build` first' };

let app;
let server;
let origin;
before(async () => {
  if (!built) return;
  app = createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise((ok) => server.once('listening', ok));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.close();
  await app?.locals.engine.close();
});

const timed = (path) =>
  new Promise((ok, no) => {
    const t0 = performance.now();
    let first;
    let body = '';
    http.get(origin + path, (res) => {
      res.on('data', (d) => { first ??= performance.now() - t0; body += d; });
      res.on('end', () => ok({ first, last: performance.now() - t0, body }));
    }).on('error', no);
  });

test('streaming sends the page before the slow island is done; res.render does not', opts, async () => {
  const ooo = await timed('/');
  const whole = await timed('/whole');
  assert.ok(ooo.first < 1000, `first byte at ${ooo.first} ms`);
  assert.ok(ooo.last >= 1400, `last byte at ${ooo.last} ms`);
  assert.ok(whole.first >= 1400, `res.render answered at ${whole.first} ms`);
  for (const r of [ooo, whole]) assert.match(r.body, /alpha/); // every island is in the page
  assert.match(ooo.body, /id="stencil-islands"/);
  assert.match(ooo.body, /"name":"footer","client":"static","files":\[\]/); // the static island needs no module
});

test('in a browser: the counter hydrates, the static island loads nothing', opts, async (t) => {
  const { chromium } = await import('playwright');
  let browser;
  try {
    const executablePath = [process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '', 'chromium')].find((p) => p && existsSync(p));
    browser = await chromium.launch({ args: ['--no-sandbox'], executablePath });
  } catch (e) {
    return t.skip(`no Chromium: ${e.message.split('\n')[0]}`);
  }
  try {
    const page = await browser.newPage();
    const modules = [];
    page.on('request', (r) => r.url().includes('/client/') && modules.push(new URL(r.url()).pathname));
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('[data-island]').length === 3, null, { timeout: 15000 });
    await page.waitForFunction(() => window.stencilIslands?.state.counter === 'ready', null, { timeout: 15000 });
    await page.locator('ex-counter button').click();
    await page.waitForFunction(() => document.querySelector('ex-counter').shadowRoot.querySelector('button').textContent === 'Clicked 1 times', null, { timeout: 5000 });
    assert.ok(modules.includes('/client/components/ex-counter.js'));
    assert.ok(!modules.includes('/client/components/ex-note.js'), 'the static island must not load its component');
  } finally {
    await browser.close();
  }
});
