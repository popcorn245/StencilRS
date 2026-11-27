// Hydrates the whole kitchen-sink page N times with the production hydrate client and exits 1 unless every hydration comes to the same DOM.
//
//   node check/hydrate-order.mjs [scoped|dsd] [N=30] [dumpDir]      (after `npm run build:hydrate` and the client build, see check/islands.mjs)
//
// Guards the order of the light-DOM children of shadow hosts (ion-tab and ion-tab-bar in ion-tabs, ion-title and ion-buttons in ion-toolbar):
// Stencil's client put them in slot order about 1 time in 10 in scoped mode, a load-order race with per-tag modules, patched by client-patches.js.
// Prints the count of each distinct signature (the first of each is written to `dumpDir` as `<mode>-vN.sig` when given). `ISLANDS_CLIENT=stencil` picks
// Stencil's own client, `CLIENT_ONLY=1` skips the server render.
import { writeFileSync } from 'node:fs';
import { CLIENTS } from '../spike/islands/clients.mjs';
import { hydrationReport, renderShell } from '../spike/islands/islands.mjs';
import { PAGES, MODES, launch, loadHydrate, renderOptions, serve } from '../spike/islands/lib.mjs';
const mode = process.argv[2] ?? 'scoped';
const n = Number(process.argv[3] ?? 30);
const out = process.argv[4];
const client = CLIENTS[process.env.ISLANDS_CLIENT ?? 'hydrate'];
const hydrate = await loadHydrate();
const html = process.env.CLIENT_ONLY ? PAGES['kitchen-sink'].full() : (await hydrate.renderToString(PAGES['kitchen-sink'].full(), { ...renderOptions(MODES[mode]), fullDocument: true })).html;
const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: client.dir });
const browser = await launch();
const seen = new Map();
for (let i = 0; i < n; i++) {
  const r = await hydrationReport(browser, origin, html, '/', client.boot);
  const k = r.sigNoCtx;
  if (!seen.has(k)) { seen.set(k, 0); if (out) writeFileSync(`${out}/${mode}-v${seen.size}.sig`, r.sig); }
  seen.set(k, seen.get(k) + 1);
}
console.log(`${mode}: ${n} hydrations, ${seen.size} distinct DOM signature${seen.size === 1 ? '' : 's'}`, [...seen.values()]);
await browser.close();
server.close();
if (seen.size !== 1) process.exit(1);
