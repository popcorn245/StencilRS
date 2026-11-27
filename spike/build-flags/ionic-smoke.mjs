// usage: node ionic-smoke.mjs <ionicDir> <distName>...   drives the app-tabs layout against each build (dist-stencilrs copies) and compares DOM snapshots.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const [root, ...dists] = process.argv.slice(2);
const { chromium } = createRequire(root + '/x.js')('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const html = `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<link rel=stylesheet href=/css/core.css><link rel=stylesheet href=/css/ionic.bundle.css onerror="this.remove()"><script type=module src=/ionic.js></script></head><body>
<ion-app><ion-tabs>
 <ion-tab tab=home><div class=ion-page><ion-header><ion-toolbar><ion-title>Home</ion-title></ion-toolbar></ion-header><ion-content class=ion-padding>
   <ion-card><ion-card-header><ion-card-title>Today</ion-card-title></ion-card-header><ion-card-content>Three things.</ion-card-content></ion-card>
   <ion-list><ion-item><ion-avatar slot=start></ion-avatar><ion-label>One</ion-label><ion-note slot=end>x</ion-note></ion-item></ion-list></ion-content></div></ion-tab>
 <ion-tab tab=search><div class=ion-page><ion-header><ion-toolbar><ion-title>Search</ion-title></ion-toolbar></ion-header><ion-content><ion-searchbar placeholder=Search></ion-searchbar></ion-content></div></ion-tab>
 <ion-tab tab=settings><div class=ion-page><ion-header><ion-toolbar><ion-title>Settings</ion-title></ion-toolbar></ion-header><ion-content>
   <ion-list><ion-item><ion-toggle checked>Notifications</ion-toggle></ion-item><ion-item><ion-input label=Name value=Ada></ion-input></ion-item><ion-item><ion-checkbox>Beta</ion-checkbox></ion-item></ion-list></ion-content></div></ion-tab>
 <ion-tab-bar slot=bottom selected-tab=home>
  <ion-tab-button tab=home><ion-label>Home</ion-label></ion-tab-button><ion-tab-button tab=search><ion-label>Search</ion-label></ion-tab-button><ion-tab-button tab=settings><ion-label>Settings</ion-label></ion-tab-button>
 </ion-tab-bar></ion-tabs></ion-app></body></html>`;
const snaps = [];
for (const d of dists) {
  const dir = join(root, d);
  const srv = createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (u === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(html);
    const p = join(dir, u);
    if (!existsSync(p) || !statSync(p).isFile()) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
  }).listen(0);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 400, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForFunction(() => document.querySelector('ion-tab-button')?.classList.contains('hydrated'), null, { timeout: 15000 }).catch(() => errors.push('not hydrated'));
  await page.waitForTimeout(500);
  const out = [];
  const state = () => page.evaluate(() => {
    const norm = (s) => s.replace(/ion-(tg|cb|input|sb|tb)-\d+/g, 'ION-ID').replace(/\s+/g, ' ');
    const tabs = [...document.querySelectorAll('ion-tab')].map((t) => t.getAttribute('tab') + ':' + (t.hasAttribute('hidden') || t.getAttribute('aria-hidden') === 'true' ? 'hidden' : 'shown')).join(',');
    const btns = [...document.querySelectorAll('ion-tab-button')].map((b) => b.className.replace(/\s+/g, ' ').trim() + '|' + (b.getAttribute('aria-selected') ?? '')).join(' ; ');
    const sh = (sel) => { const e = document.querySelector(sel); return norm(e.className + '||' + (e.shadowRoot ? e.shadowRoot.innerHTML : e.innerHTML)); };
    return { tabs, btns, toggle: sh('ion-toggle'), input: sh('ion-input'), checkbox: sh('ion-checkbox'), search: sh('ion-searchbar'), card: sh('ion-card'), item: sh('ion-item') };
  });
  out.push(await state());
  await page.click('ion-tab-button[tab=search]');
  await page.waitForTimeout(600);
  await page.fill('ion-searchbar input', 'abc').catch((e) => errors.push('fill ' + e.message.slice(0, 60)));
  out.push(await state());
  await page.click('ion-tab-button[tab=settings]');
  await page.waitForTimeout(600);
  await page.click('ion-toggle');
  await page.click('ion-checkbox');
  await page.fill('ion-input input', 'Grace').catch((e) => errors.push('fill2 ' + e.message.slice(0, 60)));
  await page.waitForTimeout(300);
  out.push(await state());
  const snap = JSON.stringify(out, null, 1);
  snaps.push(snap);
  console.log(`== ${d}: errors=${JSON.stringify(errors)} snapshot ${snap.length} chars; toggle checked after click: ${JSON.stringify(out[2].toggle).slice(0, 120)}`);
  await browser.close();
  srv.close();
}
const same = snaps.every((s) => s === snaps[0]);
console.log('SAME', same);
if (!same) {
  const a = snaps[0].split('\n'), b = snaps[1].split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log('first diff line', i, '\n', a[i]?.slice(0, 300), '\n', b[i]?.slice(0, 300)); break; }
}
process.exit(same ? 0 : 1);
