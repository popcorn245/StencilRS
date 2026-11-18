// `npm run snapshots`: Playwright photographs the built site into site/public/img/:
//   chart-<id>.png          every benchmark chart (BenchChart), light theme, 960 px wide
//   chart-ionic-headline.png the three charts of the home page together
//   og.png                  the social card, 1200x630
//   home.png                the home page
//   components/<name>-<mode>.png   Ionic demos: button, card, list, toggle, and the modal open, in ios and md
// Everything is drawn from the data files by the site build, so a rerun only changes a PNG when its numbers
// (or the page) change. Deterministic knobs: fixed viewport, deviceScaleFactor 2 (1 for the card, which must be
// exactly 1200x630), reduced motion, animations and carets off, fonts loaded, UTC, a fixed locale.
//   --build   run `vitepress build` first (default: only when dist/ is missing)
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const site = fileURLToPath(new URL('..', import.meta.url));
const dist = join(site, 'dist');
const out = join(site, 'public', 'img');
const shell = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

if (process.argv.includes('--build') || !existsSync(join(dist, 'index.html'))) {
  const r = spawnSync('npm', ['run', 'build'], { cwd: site, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
mkdirSync(join(out, 'components'), { recursive: true });

// The site is built for base '/', so dist/ is served as is.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = join(dist, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: shell });
}

const freeze = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }`;
async function context(scale, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: scale, reducedMotion: 'reduce', colorScheme: 'light',
    locale: 'en-US', timezoneId: 'UTC', ...extra,
  });
  await ctx.addInitScript(() => { try { localStorage.setItem('vitepress-theme-appearance', 'light'); } catch {} });
  return ctx;
}
async function open(page, path) {
  await page.goto(origin + path, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: freeze });
  await page.evaluate(() => document.fonts.ready);
}
const written = [];
async function shoot(target, name, opts = {}) {
  const file = join(out, name);
  mkdirSync(dirname(file), { recursive: true });
  await target.screenshot({ path: file, animations: 'disabled', caret: 'hide', ...opts });
  written.push(name);
}

// 1. Charts, 2. headline, 3. home page
{
  const ctx = await context(2);
  const page = await ctx.newPage();
  const seen = new Set();
  // Fixed width, and the data table closed or hidden: the PNG is the chart, its caption and its note.
  const chartCss = `.bench-chart { width: 480px !important; max-width: none !important; margin: 0 !important; } .bc-details { display: none !important; }`;
  for (const path of ['/benchmarks.html', '/']) {
    await open(page, path);
    await page.addStyleTag({ content: chartCss });
    await page.waitForTimeout(100);
    for (const fig of await page.locator('figure.bench-chart[data-chart]').all()) {
      const id = await fig.getAttribute('data-chart');
      if (seen.has(id)) continue;
      seen.add(id);
      await fig.scrollIntoViewIfNeeded();
      await shoot(fig, `chart-${id}.png`);
    }
  }
  await open(page, '/');
  await page.addStyleTag({ content: `.ionic-headline .bench-chart { width: auto !important; }` });
  await page.waitForFunction(() => document.documentElement.classList.contains('elements-ready'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shoot(page.locator('.ionic-headline'), 'chart-ionic-headline.png');
  await shoot(page, 'home.png', { fullPage: true });
  await ctx.close();
}

// 4. Ionic demos
{
  for (const mode of ['ios', 'md']) {
    const ctx = await context(2);
    await ctx.addInitScript((m) => { try { localStorage.setItem('stencilrs-ionic-mode', m); } catch {} }, mode);
    const page = await ctx.newPage();
    for (const name of ['button', 'card', 'list', 'toggle']) {
      await open(page, `/components/${name}.html`);
      await page.waitForFunction((m) => document.documentElement.classList.contains('ionic-ready') && document.documentElement.getAttribute('mode') === m, mode, { timeout: 60000 });
      const stage = page.locator('.ion-stage').first();
      await page.waitForFunction(() => document.querySelector('.ion-stage')?.querySelector('*[class*="hydrated"]') != null, null, { timeout: 60000 });
      await page.waitForTimeout(600);
      await shoot(stage, `components/${name}-${mode}.png`);
    }
    // the modal, open
    await open(page, '/components/modal.html');
    await page.waitForFunction((m) => document.documentElement.classList.contains('ionic-ready') && document.documentElement.getAttribute('mode') === m, mode, { timeout: 60000 });
    await page.waitForSelector('#open-modal-demo.hydrated', { timeout: 60000 });
    await page.click('#open-modal-demo');
    await page.waitForSelector('ion-modal.show-modal', { timeout: 30000 });
    await page.waitForTimeout(800);
    await shoot(page, `components/modal-open-${mode}.png`);
    await ctx.close();
  }
}

// 5. The social card, 1200x630 at scale 1
{
  const ctx = await context(1, { viewport: { width: 1200, height: 630 } });
  const page = await ctx.newPage();
  await open(page, '/social-card.html');
  await shoot(page.locator('.social-card'), 'og.png');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`wrote ${written.length} images to site/public/img/:\n  ${written.join('\n  ')}`);
