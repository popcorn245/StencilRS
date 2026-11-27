// The starter built for production on the stencilrs runtime with its default `runtimeFeatures` ('auto'), loaded in Chromium: the features the
// build kept, that every component of index.html rendered, and that the counter, the toggle and the form field work.
//
//   node scripts/smoke-gated.mjs        (CHROME=/path/to/chrome overrides the browser)
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

import stencilrs from '@popcorn245/stencilrs/vite';
import { chromium } from 'playwright';
import { build } from 'vite';

const root = join(import.meta.dirname, '..');
const out = mkdtempSync(join(tmpdir(), 'starter-gated-'));
const messages = [];
await build({
  root,
  configFile: false,
  logLevel: 'silent',
  customLogger: { info: (m) => messages.push(m), warn: (m) => messages.push(m), warnOnce: () => {}, error: (m) => messages.push(m), clearScreen: () => {}, hasErrorLogged: () => false, hasWarned: false },
  plugins: [stencilrs({ runtime: 'stencilrs', signals: true, verbose: true })],
  build: { outDir: out, emptyOutDir: true },
});
console.log(messages.find((m) => m.includes('runtimeFeatures')) ?? 'runtimeFeatures: (not logged)');
const js = readdirSync(join(out, 'assets')).filter((f) => f.endsWith('.js'));
console.log(`JS: ${js.map((f) => `${f} ${gzipSync(readFileSync(join(out, 'assets', f)), { level: 9 }).length} B gzip`).join(', ')}`);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let body;
  const file = join(out, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  try {
    body = readFileSync(file);
  } catch {
    return res.writeHead(404).end();
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` ${extra}` : ''}`);
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text())); // the favicon
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForFunction(() => document.querySelector('pop-counter')?.classList.contains('hydrated'));
  const tags = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((t) => t.startsWith('pop-')))]);
  const rendered = await page.evaluate((tags) => tags.map((t) => [t, !!document.querySelector(t).shadowRoot?.children.length]), tags);
  check(`every component rendered (${tags.length})`, rendered.every(([, ok]) => ok), JSON.stringify(rendered.filter(([, ok]) => !ok)));
  await page.locator('pop-counter button').first().click();
  await page.locator('pop-counter button').first().click();
  check('pop-counter counts', (await page.evaluate(() => document.querySelector('pop-counter').shadowRoot.textContent)).includes('2'));
  check('pop-counter event reached the page', (await page.textContent('#log')).includes('countChanged'));
  const active = () => page.evaluate(() => document.querySelector('pop-toggle').classList.contains('active'));
  const before = await active();
  await page.locator('pop-toggle button').first().click();
  await page.waitForTimeout(50);
  check('pop-toggle toggles its host class', before === false && (await active()) === true);
  await page.click('#date-form button[type=submit]');
  check('pop-date-field submits with its form', (await page.textContent('#date-out')).includes('2026-10-15'), await page.textContent('#date-out'));
  check('no page errors', errors.length === 0, errors.join('; '));
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
