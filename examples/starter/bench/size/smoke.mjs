// Checks that each built app works (the size numbers mean nothing for an app that does not run): it renders the
// button and 10 items in its shadow root, and a click adds one to the count and moves the bold item.
//
//   node smoke.mjs [name ...]      after `node run.mjs`; CHROME=/path/to/chrome overrides the browser
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const here = import.meta.dirname;
const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(here, 'dist')).filter((n) => !n.startsWith('feat-'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
for (const name of names) {
  const dir = join(here, 'dist', name);
  const server = createServer((req, res) => {
    const file = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    try {
      if (!statSync(file).isFile()) throw 0;
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  }).listen(0);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/`);
  try {
    // `piercing` locators see into the open shadow root.
    await page.waitForSelector('button', { timeout: 3000 });
    const state = () => page.evaluate(() => {
      const host = document.querySelector('size-app') || document.querySelector('.app'); // Qwik has no custom element, no shadow root
      const root = host.shadowRoot || host;
      return { button: root.querySelector('button').textContent.replace(/\s+/g, ' ').trim(), items: root.querySelectorAll('li').length, on: [...root.querySelectorAll('li')].findIndex((li) => li.classList.contains('on') || getComputedStyle(li).fontWeight === '700'), styled: getComputedStyle(host).borderTopWidth };
    });
    const before = await state();
    await page.click('button');
    await page.waitForTimeout(600);
    const after = await state();
    const ok = before.items === 10 && before.button === 'Clicks: 0' && after.button === 'Clicks: 1' && before.on === 0 && after.on === 1 && before.styled === '1px' && !errors.length;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(16)} ${JSON.stringify(before)} -> ${JSON.stringify(after)}${errors.length ? ' errors: ' + errors.join('; ') : ''}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name.padEnd(16)} ${e.message.split('\n')[0]}${errors.length ? ' errors: ' + errors.join('; ') : ''}`);
  }
  await page.close();
  server.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
