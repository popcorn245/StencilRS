// usage: node smoke.mjs <starterRoot> <distDir>...   : serves each dist, drives the starter page, prints a DOM snapshot per dist; exit 1 if they differ.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const [root, ...dists] = process.argv.slice(2);
const { chromium } = createRequire(root + '/x.js')('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const snaps = [];
for (const d of dists) {
  const dir = join(root, d);
  const srv = createServer((req, res) => {
    let p = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!existsSync(p)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
  }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(300);
  const click = async (sel, n = 1) => {
    for (let i = 0; i < n; i++) await page.locator(sel).first().click();
  };
  // click every button inside every component (shadow or light), several times
  await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('pop-counter, pop-greeting, pop-toggle, pop-press-button, pop-tone-chip, pop-date-field')) {
      const root = el.shadowRoot ?? el;
      for (const b of root.querySelectorAll('button')) { b.click(); b.click(); }
    }
  });
  await page.waitForTimeout(200);
  await page.fill('pop-greeting >> input', 'World').catch(() => {});
  await page.waitForTimeout(100);
  await page.click('button[type=submit]');
  await page.waitForTimeout(200);
  const snap = await page.evaluate(() => {
    const ser = (el) => (el.shadowRoot ? `<sr>${el.shadowRoot.innerHTML}</sr>` : '') + el.innerHTML;
    return [...document.querySelectorAll('pop-counter, pop-greeting, pop-toggle, pop-press-button, pop-tone-chip, pop-date-field')].map((e) => e.localName + ':' + e.className + ':' + ser(e)).join('\n') + '\n#log=' + document.querySelector('#log').textContent + '\n#date-out=' + document.querySelector('#date-out').textContent;
  });
  console.log(`== ${d} errors=${JSON.stringify(errors)}\n${snap}`);
  snaps.push(snap);
  await browser.close();
  srv.close();
}
const same = snaps.every((s) => s === snaps[0]);
console.log('SAME', same);
process.exit(same ? 0 : 1);
