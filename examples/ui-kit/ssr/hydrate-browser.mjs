// Hydrate the server-rendered page in a real browser (Chromium, through Playwright).
//
// CI installs Playwright's package but never its browsers (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD), so
// the browser is looked up: $STENCILRS_CHROMIUM, $PLAYWRIGHT_BROWSERS_PATH/chromium (a link to
// the browser, as /opt/pw-browsers has it), then Playwright's own download. With none, `findChromium`
// returns null and the step is skipped, not failed.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { clickSwitch, hydrationState, markServerNodes } from './page.mjs';

export const findChromium = async () => {
  const candidates = [process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers', 'chromium')];
  try {
    candidates.push((await import('playwright')).chromium.executablePath());
  } catch {
    return { playwright: false, path: null };
  }
  return { playwright: true, path: candidates.find((c) => c && existsSync(c)) ?? null };
};

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' };

/** The server-rendered page at `/` and the client bundle's files beside it. */
const serve = (html, clientDir) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path === '/') return void res.writeHead(200, { 'content-type': 'text/html' }).end(html);
      const file = join(clientDir, path);
      if (!file.startsWith(clientDir) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });

/**
 * Two loads of the same server-rendered HTML: with JavaScript off (what a crawler or a slow
 * network shows first: the content must already be there), then on, where the client bundle
 * must adopt the server's elements and the components must work.
 */
export const hydrateInBrowser = async ({ html, clientDir, executablePath, entry = "import '/components.js';" }) => {
  const { chromium } = await import('playwright');
  const { server, url } = await serve(html, clientDir);
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const noScript = await plain.newPage();
    await noScript.goto(url);
    const withoutJs = await noScript.evaluate(() => ({
      text: document.body.innerText,
      switchChecked: document.querySelector('pop-switch button')?.getAttribute('aria-checked'),
      shadowText: document.querySelector('pop-address-autocomplete')?.shadowRoot?.querySelector('input')?.getAttribute('placeholder'),
    }));
    await plain.close();

    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url, { waitUntil: 'load' });
    // The server's elements are remembered, then the client bundle loaded: it must adopt them.
    const marked = await page.evaluate(`(${markServerNodes})(document)`);
    await page.addScriptTag({ type: 'module', content: entry });
    await page.waitForFunction(() => customElements.get('pop-switch') && customElements.get('pop-card'), null, { timeout: 30000 });
    await page.waitForTimeout(500); // the components' first (hydrating) render
    const state = await page.evaluate(`(${hydrationState})(document)`);
    const click = await page.evaluate(`(${clickSwitch})(document)`).catch(() => null);
    return { withoutJs, marked, state, click, errors };
  } finally {
    await browser.close();
    server.close();
  }
};
