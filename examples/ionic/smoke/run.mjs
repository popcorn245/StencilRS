// Smoke test: load a Stencil build of Ionic core in headless Chrome, in ios and md mode, check that button,
// card, list, toggle and modal are defined, hydrated and interactive, and save a screenshot of each.
//
//   node smoke/run.mjs [stencil|stencil4|stencilrs] [--shots <dir>]
//
// stencil = dist-stencil (Stencil v5, default), stencil4 = dist-stencil4 (stock Ionic on Stencil 4),
// stencilrs = dist-stencilrs (the Vite plugin build: one module, ionic.js, instead of the lazy loader).
// Screenshots go to smoke/shots/ unless --shots is given. Exits 1 on any failed check, page error or
// console error. The page and the build are served from a throwaway local http server.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { root } from '../scripts/paths.mjs';

const args = process.argv.slice(2);
const shotsFlag = args.indexOf('--shots');
const build = args.find((a, i) => !a.startsWith('--') && (shotsFlag < 0 || i !== shotsFlag + 1)) ?? 'stencil';
const shotsDir = shotsFlag >= 0 ? args[shotsFlag + 1] : join(root, 'smoke', 'shots');
const buildDir = join(root, { stencil: 'dist-stencil', stencil4: 'dist-stencil4', stencilrs: 'dist-stencilrs' }[build] ?? 'dist-stencil');
const entry = build === 'stencilrs' ? 'ionic.js' : join('dist', 'ionic', 'ionic.esm.js');
if (!existsSync(join(buildDir, entry))) {
  console.error(`${buildDir} has no build: run npm run build:${build}`);
  process.exit(1);
}
mkdirSync(shotsDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json' };
const serve = (base, rel, res) => {
  const file = normalize(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
};
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path.startsWith('/build/')) serve(buildDir, path.slice('/build/'.length), res);
  else if (path === '/' && build === 'stencilrs') {
    const html = readFileSync(join(root, 'smoke', 'index.html'), 'utf8').replace('/build/dist/ionic/ionic.esm.js', '/build/ionic.js');
    res.writeHead(200, { 'content-type': 'text/html' }).end(html);
  } else serve(join(root, 'smoke'), path === '/' ? 'index.html' : path.slice(1), res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// CHROME_PATH points at another Chromium build, for machines whose installed browser is not the revision this
// Playwright version expects (`npx playwright install chromium` fixes that properly).
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let failures = 0;
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
};

for (const mode of ['ios', 'md']) {
  console.log(`${build} / ${mode}`);
  const page = await browser.newPage({ viewport: { width: 820, height: 1000 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => msg.type() === 'error' && problems.push(`console.error: ${msg.text()} (${msg.location().url})`));
  page.on('requestfailed', (req) => problems.push(`request failed: ${req.url()}`));
  page.on('response', (res) => res.status() >= 400 && problems.push(`HTTP ${res.status()}: ${res.url()}`));

  await page.goto(`${origin}/?ionic:mode=${mode}`);
  const tags = ['ion-button', 'ion-card', 'ion-card-header', 'ion-card-title', 'ion-card-content', 'ion-list', 'ion-item', 'ion-label', 'ion-toggle', 'ion-modal'];
  await Promise.all(tags.map((t) => page.waitForSelector(`${t}.hydrated`, { state: 'attached', timeout: 15000 })));
  await page.evaluate(() => document.getElementById('modal').componentOnReady());
  // the modal animates in; wait for its sheet to be shown
  await page.waitForSelector('ion-modal.show-modal', { timeout: 15000 });
  await page.waitForFunction(() => !document.getElementById('modal').classList.contains('overlay-hidden'), null, { timeout: 15000 });
  await page.waitForTimeout(900);

  check((await page.evaluate(() => document.documentElement.getAttribute('mode'))) === mode, `<html mode="${mode}">`);
  check(await page.evaluate((m) => document.getElementById('btn').classList.contains(m), mode), `ion-button has class "${mode}"`);
  const states = await page.evaluate((tags) => tags.map((t) => [t, !!customElements.get(t), !!document.querySelector(`${t}.hydrated`)]), tags);
  for (const [tag, defined, hydrated] of states) check(defined && hydrated, `${tag} defined and hydrated`);
  check(await page.evaluate(() => !!document.getElementById('btn').shadowRoot?.querySelector('button.button-native')), 'ion-button renders <button> in its shadow root');
  check(await page.evaluate(() => !!document.querySelector('ion-card-title').shadowRoot), 'ion-card-title has a shadow root');
  // the modal over the page, before anything is clicked
  const shot = join(shotsDir, `${build}-${mode}.png`);
  await page.screenshot({ path: shot });
  console.log(`  shot ${shot}`);

  const toggled = await page.evaluate(async () => {
    const t = document.getElementById('tgl');
    const before = t.checked;
    t.shadowRoot.querySelector('input').click();
    await new Promise((r) => setTimeout(r, 300));
    return [before, t.checked];
  });
  check(toggled[0] === false && toggled[1] === true, 'clicking ion-toggle checks it');
  const radius = await page.evaluate(() => getComputedStyle(document.getElementById('btn').shadowRoot.querySelector('button')).borderRadius);
  console.log(`  info button border-radius ${radius}`);
  check(radius !== '' && radius !== '0px', 'ion-button has mode styles (border-radius)');
  const modalBox = await page.evaluate(() => {
    const wrapper = document.getElementById('modal').shadowRoot.querySelector('.modal-wrapper');
    const r = wrapper.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  check(modalBox.w > 100 && modalBox.h > 100, `modal wrapper is laid out (${modalBox.w}x${modalBox.h})`);

  // close the modal and shoot the page itself, so cards and lists are visible
  await page.evaluate(() => document.getElementById('modal-close').click());
  await page.waitForFunction(() => document.getElementById('modal').classList.contains('overlay-hidden'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const page2 = join(shotsDir, `${build}-${mode}-page.png`);
  await page.screenshot({ path: page2, fullPage: true });
  console.log(`  shot ${page2}`);

  check(problems.length === 0, `no page errors / failed requests${problems.length ? '\n    ' + problems.join('\n    ') : ''}`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
