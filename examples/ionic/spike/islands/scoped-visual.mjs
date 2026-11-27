// #206: pixels. Each variant hydrated in Chromium (Stencil's lazy-loader client), a screenshot at 520x900, and the pixels that differ
// from the client-only render (the ground truth) and from the same-mode full render. Also JS off (what the server wrote).
//   node spike/islands/scoped-visual.mjs [list-50,kitchen-sink,stress] [js=on|off]
import { join } from 'node:path';
import { stencilEngine } from '../../../../express.js';
import { client } from './clients.mjs';
import { HYDRATE, PAGES, launch, renderOptions, serve, MODES } from './lib.mjs';
import { writeViews } from './views.mjs';

const names = (process.argv[2] ?? 'list-50,kitchen-sink').split(',');
const js = (process.argv[3] ?? 'on') === 'on';
const dir = writeViews(names);
const engines = {};
for (const mode of ['dsd', 'scoped']) engines[mode] = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[mode]), islands: {} });
const render = (e, file) => new Promise((ok, no) => e(file, {}, (err, h) => (err ? no(err) : ok(h))));
const browser = await launch();

const shot = async (html) => {
  const ctx = await browser.newContext({ viewport: { width: 520, height: 900 }, javaScriptEnabled: js, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: client.dir });
  await page.goto(origin, { waitUntil: 'load' });
  if (js) {
    await page.addScriptTag({ type: 'module', content: client.boot });
    await page.waitForFunction(() => customElements.get('ion-item') || customElements.get('ion-toggle') || customElements.get('ion-button'), null, { timeout: 30000 });
    await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('*')].filter((e) => e.componentOnReady).map((e) => e.componentOnReady())); });
    await page.waitForTimeout(600);
  }
  const png = await page.screenshot({ animations: 'disabled' });
  const hosts = js ? await page.evaluate(() => [...document.querySelectorAll('ion-item,ion-card,ion-button,ion-toggle,ion-content,ion-list')].slice(0, 400).map((e) => { const r = e.getBoundingClientRect(); return [e.localName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), getComputedStyle(e).display].join(':'); })) : [];
  await ctx.close(); server.close();
  return { png, hosts };
};
const differ = await browser.newPage();
const diff = async (a, b) => differ.evaluate(async ([a, b]) => {
  const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
  const [x, y] = await Promise.all([load(a), load(b)]);
  const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
  const p = px(x), q = px(y); let n = 0;
  for (let k = 0; k < p.length; k += 4) if (Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]) > 8) n++;
  return n;
}, [a.toString('base64'), b.toString('base64')]);

const rows = [];
for (const name of names) {
  const v = {
    client: PAGES[name].full(),
    dsd: await render(engines.dsd, join(dir, `${name}.full.html`)),
    scoped: await render(engines.scoped, join(dir, `${name}.full.html`)),
    'islands-dsd': await render(engines.dsd, join(dir, `${name}.html`)),
    'islands-scoped': await render(engines.scoped, join(dir, `${name}.html`)),
  };
  const s = {};
  for (const [k, html] of Object.entries(v)) s[k] = await shot(html);
  if (process.env.SAVE) for (const [k, r] of Object.entries(s)) (await import('node:fs')).writeFileSync(`${process.env.SAVE}/${name}-${k}-${js ? 'js' : 'nojs'}.png`, r.png);
  for (const k of Object.keys(v)) {
    const same = k.includes('scoped') ? 'scoped' : 'dsd';
    rows.push({ page: name, variant: k, 'px vs client-only': await diff(s[k].png, s.client.png), 'px vs full (same mode)': await diff(s[k].png, s[same].png), 'host boxes = client-only': js ? JSON.stringify(s[k].hosts) === JSON.stringify(s.client.hosts) : '-', hosts: s[k].hosts.length });
  }
}
console.log(`JS ${js ? 'on' : 'off'}`);
console.table(rows);
await browser.close();
await Promise.all(Object.values(engines).map((e) => e.close()));
