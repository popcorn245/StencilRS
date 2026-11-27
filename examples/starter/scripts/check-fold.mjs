// `foldRuntimeFlags` (on by default): the starter's production build, folded and unfolded, driven in Chromium. The interactions must work, with no
// page error, and both builds must leave the same DOM; the folded one must be much smaller. Skipped (exit 0) where there is no Chromium.
//   node scripts/check-fold.mjs        (npm run check:fold)
// The browser is looked up as the other Playwright checks do: $STENCILRS_CHROMIUM, $PLAYWRIGHT_BROWSERS_PATH/chromium (default /opt/pw-browsers),
// then Playwright's own download.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import stencilrs from '@popcorn245/stencilrs/vite';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const findChromium = async () => {
  const candidates = [process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers', 'chromium')];
  try {
    candidates.push((await import('playwright')).chromium.executablePath());
  } catch {
    return null;
  }
  return candidates.find((c) => c && existsSync(c)) ?? null;
};

// A browser that never answers must fail the check, not hang CI.
setTimeout(() => {
  console.error('check-fold: timed out');
  process.exit(1);
}, 180_000).unref();

const tmp = mkdtempSync(join(tmpdir(), 'check-fold-'));
const fail = (m) => {
  console.error(`check-fold: ${m}`);
  process.exitCode = 1;
};

const make = async (name, options) => {
  const outDir = join(tmp, name);
  await build({ root, configFile: false, logLevel: 'silent', plugins: [stencilrs({ signals: true, ...options })], build: { outDir, emptyOutDir: true } });
  const js = readdirSync(join(outDir, 'assets')).filter((f) => f.endsWith('.js'));
  return { outDir, gzip: js.reduce((n, f) => n + gzipSync(readFileSync(join(outDir, 'assets', f)), { level: 9 }).length, 0) };
};

const drive = async (chromium, executablePath, { outDir }) => {
  const server = createServer((req, res) => {
    const file = join(outDir, new URL(req.url, 'http://x').pathname === '/' ? 'index.html' : new URL(req.url, 'http://x').pathname);
    if (file.endsWith('favicon.ico')) return void res.writeHead(204).end();
    if (!file.startsWith(outDir) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  }).listen(0, '127.0.0.1');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => ['pop-counter', 'pop-greeting', 'pop-toggle', 'pop-press-button', 'pop-tone-chip', 'pop-date-field'].every((t) => document.querySelector(t)?.classList.contains('hydrated')));
    // Every button of every component (shadow or light DOM), twice.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('pop-counter, pop-greeting, pop-toggle, pop-press-button, pop-tone-chip, pop-date-field')) {
        for (const b of (el.shadowRoot ?? el).querySelectorAll('button')) {
          b.click();
          b.click();
        }
      }
    });
    await page.waitForTimeout(200);
    await page.fill('pop-greeting >> input', 'World').catch(() => {});
    await page.waitForTimeout(100);
    await page.click('button[type=submit]');
    await page.waitForTimeout(200);
    return await page.evaluate(() => {
      const ser = (el) => (el.shadowRoot ? `<sr>${el.shadowRoot.innerHTML}</sr>` : '') + el.innerHTML;
      const dom = [...document.querySelectorAll('pop-counter, pop-greeting, pop-toggle, pop-press-button, pop-tone-chip, pop-date-field')].map((e) => `${e.localName}:${e.className}:${ser(e)}`).join('\n');
      return { dom, log: document.querySelector('#log').textContent, submitted: document.querySelector('#date-out').textContent, errors: [], counter: document.querySelector('pop-counter').shadowRoot?.textContent ?? '' };
    }).then((r) => ({ ...r, errors }));
  } finally {
    await browser.close();
    server.close();
  }
};

try {
  const executablePath = await findChromium();
  const [plain, folded] = [await make('plain', { foldRuntimeFlags: false }), await make('folded', {})];
  console.log(`starter production build, gzip: ${plain.gzip} B unfolded, ${folded.gzip} B folded (${Math.round((1 - folded.gzip / plain.gzip) * 100)} % smaller)`);
  if (folded.gzip > plain.gzip * 0.7) fail('the folded build is not at least 30 % smaller');
  if (!executablePath) console.log('check-fold: no Chromium (Playwright or its browser is not installed), the browser step is skipped');
  else {
    const { chromium } = await import('playwright');
    const a = await drive(chromium, executablePath, plain);
    const b = await drive(chromium, executablePath, folded);
    for (const [name, r] of [['unfolded', a], ['folded', b]]) {
      if (r.errors.length) fail(`${name}: page errors ${JSON.stringify(r.errors)}`);
      if (!/countChanged/.test(r.log)) fail(`${name}: the counter's event did not reach the page (#log is ${JSON.stringify(r.log)})`);
      if (!/when/.test(r.submitted)) fail(`${name}: the form-associated field did not submit (${JSON.stringify(r.submitted)})`);
    }
    if (a.dom !== b.dom) fail('the folded and unfolded builds left different DOM after the same interactions');
    console.log(process.exitCode ? 'check-fold: FAILED' : 'check-fold: the folded build behaves as the unfolded one (clicks, input, events, form submit)');
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
