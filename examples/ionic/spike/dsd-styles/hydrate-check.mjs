// Client hydration over each variant (docs/spike-dsd-styles.md): the stencilrs-built Ionic client (dist-stencilrs, npm run
// build:stencilrs) hydrates the server's pages; afterwards, per shadow root: how many <style>, <link> and adopted sheets
// it holds, whether the server's elements survived, and whether a hydrated ion-toggle works.
//   node spike/dsd-styles/hydrate-check.mjs <variantsDir> [page] [variants]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const [dir, page = 'list-50', variantsArg = 'a-inline,b-link,b-preload,b-link-nostyid'] = process.argv.slice(2);
const client = new URL('../../dist-stencilrs/', import.meta.url).pathname;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.startsWith('/build/') ? join(client, path.slice(7)) : join(dir, path);
  let body;
  const m = path.match(/^\/(b-link-nostyid)\/(.*)$/);
  if (m) {
    // the b-link page with the `sty-id` attribute left off the links: what Stencil's client would see without our marker
    body = readFileSync(join(dir, 'b-link', m[2]), 'utf8').replace(/(<link rel="stylesheet" href="\/c\/[^"]+") sty-id="[^"]+">/g, '$1>');
    return void res.writeHead(200, { 'content-type': 'text/html' }).end(body.replace('</head>', '<script type="module" src="/build/ionic.js"></script></head>'));
  }
  if (!existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
  body = readFileSync(file);
  if (extname(file) === '.html') body = body.toString().replace('</head>', '<script type="module" src="/build/ionic.js"></script></head>');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const v of variantsArg.split(',')) {
  const p = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  const requests = [];
  p.on('request', (r) => r.url().includes('/c/') && requests.push(r.url().split('/c/')[1]));
  await p.route('**/build/ionic.js', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.continue();
  });
  await p.goto(`http://127.0.0.1:${server.address().port}/${v}/${page}.html`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    window.__server = [];
    const visit = (root) => {
      for (const el of root.querySelectorAll('*')) {
        if (['script', 'style', 'link'].includes(el.localName)) continue;
        window.__server.push(el);
        if (el.shadowRoot) visit(el.shadowRoot);
      }
    };
    visit(document);
  });
  await p.waitForFunction(() => customElements.get('ion-toggle') && customElements.get('ion-item'), null, { timeout: 30000 });
  await p.waitForTimeout(2000);
  const s = await p.evaluate(async () => {
    const roots = [...document.querySelectorAll('*')].filter((e) => e.shadowRoot).map((e) => e.shadowRoot);
    const sum = (f) => roots.reduce((n, r) => n + f(r), 0);
    const t = document.querySelector('ion-toggle');
    const before = t.checked;
    t.shadowRoot.querySelector('input').click();
    await new Promise((r) => setTimeout(r, 200));
    return {
      roots: roots.length,
      styleEls: sum((r) => r.querySelectorAll('style').length),
      linkEls: sum((r) => r.querySelectorAll('link').length),
      adopted: sum((r) => r.adoptedStyleSheets.length),
      alive: window.__server.filter((e) => e.isConnected).length,
      total: window.__server.length,
      hydrated: document.querySelectorAll('.hydrated').length,
      toggle: before !== t.checked,
    };
  });
  console.log(v, JSON.stringify(s), 'sheet requests:', requests.length, 'errors:', errors.length ? errors[0] : 0);
  await p.close();
}
await browser.close();
server.close();
