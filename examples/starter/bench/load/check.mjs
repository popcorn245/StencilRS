// Checks the server-rendered load page (see run.mjs for how it is built) in Chromium: its 500 cards wait (resumable), keep the server's nodes, and
// wake on a click. The client bundle is built with the plugin's default `runtimeFeatures: 'auto'` and `hydrateClient`.
//
//   node bench/load/check.mjs [dir]       (default ../dist-load-stencilrs; CHROME=/path/to/chrome overrides the browser)
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
const dir = process.argv[2] ?? join(import.meta.dirname, '../dist-load-stencilrs');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const p = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  let body;
  try {
    body = readFileSync(p);
  } catch {
    return res.writeHead(404).end();
  }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'text/plain' }).end(body);
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'commit' });
await page.waitForSelector('load-card', { state: 'attached' });
const before = await page.evaluate(() => (window.__b = [...document.querySelectorAll('load-card')].map((c) => c.shadowRoot?.querySelector('.like') ?? c.querySelector('.like'))).length);
await page.waitForFunction(() => customElements.get('load-card'));
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('load-card')];
  const like = (c) => c.shadowRoot?.querySelector('.like') ?? c.querySelector('.like');
  return { cards: cards.length, kept: cards.filter((c, i) => like(c) === window.__b[i]).length, waiting: cards.filter((c) => c.__lazy).length };
});
await page.evaluate(() => { const c = document.querySelectorAll('load-card')[3]; (c.shadowRoot?.querySelector('.like') ?? c.querySelector('.like')).click(); });
await page.waitForTimeout(200);
const after = await page.evaluate(() => { const c = document.querySelectorAll('load-card')[3]; const b = c.shadowRoot?.querySelector('.like') ?? c.querySelector('.like'); return { text: b.textContent.trim(), same: b === window.__b[3] }; });
const real = errors.filter((e) => !/404/.test(e)); // the favicon
console.log(JSON.stringify({ cards: info.cards, kept: info.kept, waiting: info.waiting, after, errors: real }));
const ok = info.cards === 500 && info.kept === 500 && info.waiting === 500 && after.text === '♥ 1' && after.same && !real.length;
console.log(ok ? 'ok' : 'FAIL');
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
