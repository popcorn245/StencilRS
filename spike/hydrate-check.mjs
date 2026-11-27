// Loads the 500-card page rendered by the STRING renderer in Chromium with the real client bundle and
// checks that it resumes: every server node kept, no console errors, clicks work (a card wakes and
// updates in place, the header counter wakes and keeps the list).
//   (cd examples/starter && npx vite build --config bench/load/vite.config.ts)   # client bundle
//   (cd examples/starter && npx vite build --ssr --config ../../spike/vite.string.config.ts)
//   node spike/hydrate-check.mjs
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createStringRenderer } from './runtime-string.js';

const bench = new URL('../examples/starter/bench/', import.meta.url);
const render = await createStringRenderer(() => import(new URL('dist-load-string-server/entry-server.js', bench)));
const body = render.sync('<load-app></load-app>');
const clientDir = new URL('dist-load-stencilrs/', bench).pathname;
const shell = readFileSync(join(clientDir, 'index.html'), 'utf8');
// The shell was filled by bench/load/render.mjs (happy-dom) or still holds the placeholder: cut out whatever sits in <body>.
const html = shell.replace(/<body>[\s\S]*<\/body>/, `<body>${body}</body>`);
const js = readdirSync(join(clientDir, 'assets')).find((f) => f.endsWith('.js'));

const server = createServer((req, res) => {
  if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(html);
  let file;
  try {
    file = readFileSync(join(clientDir, req.url.split('?')[0]));
  } catch {
    return res.writeHead(req.url === '/favicon.ico' ? 204 : 404).end();
  }
  res.writeHead(200, { 'content-type': 'text/javascript' }).end(file);
}).listen(0);
await new Promise((r) => server.once('listening', r));

const { chromium } = createRequire(new URL('../examples/starter/package.json', import.meta.url))('playwright');
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(`console.${m.type()}: ${m.text()}`));
// Hold on to some server nodes before the client script runs: they must be the same objects afterwards.
await page.addInitScript(() => {
  document.addEventListener('DOMContentLoaded', () => {
    window.__before = { count: document.querySelector('#count'), likes: [...document.querySelectorAll('button.like')].filter((_, i) => i % 50 === 0), cards: [...document.querySelectorAll('load-card')].filter((_, i) => i % 50 === 0) };
  });
});
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__interactive, null, { timeout: 30000 });
await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
const r1 = await page.evaluate(() => ({
  cards: document.querySelectorAll('load-card').length,
  hydratedClass: document.querySelectorAll('load-card.hydrated').length,
  marksLeft: document.querySelectorAll('[r\\:n],[r\\:e]').length,
}));
// Click card 10 twice, card 250 once, the header counter once.
const likes = page.locator('button.like');
await likes.nth(10).click();
await likes.nth(10).click();
await likes.nth(250).click();
await page.locator('#count').click();
await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
const r2 = await page.evaluate(() => ({
  like10: document.querySelectorAll('button.like')[10].textContent,
  like250: document.querySelectorAll('button.like')[250].textContent,
  like0: document.querySelectorAll('button.like')[0].textContent,
  counter: document.querySelector('#count').textContent,
  sameNodes: window.__before ? window.__before.likes.every((b, i) => b === document.querySelectorAll('button.like')[i * 50]) && window.__before.cards.every((c, i) => c === document.querySelectorAll('load-card')[i * 50]) && window.__before.count === document.querySelector('#count') : 'no-before',
  cardsAfter: document.querySelectorAll('load-card').length,
  name10: document.querySelectorAll('load-card h3')[10].textContent,
  price10: document.querySelectorAll('load-card .price')[10].textContent,
}));
await browser.close();
server.close();
console.log(JSON.stringify({ htmlBytes: body.length, bundle: js, ...r1, ...r2, errors }, null, 1));
const ok = r1.cards === 500 && r2.cardsAfter === 500 && r2.like10 === '♥ 2' && r2.like250 === '♥ 1' && r2.like0 === '♥ 0' && r2.counter === 'Clicked 1' && r2.sameNodes === true && !errors.length;
console.log(ok ? 'HYDRATION OK' : 'HYDRATION PROBLEM');
process.exit(ok ? 0 : 1);
