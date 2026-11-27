// Follow-up 11 (#206): which DOM is right in scoped mode? Hydrate (Chromium, Stencil's lazy loader client) the same page as
//   client   the markup as it is, no server render (the components build their own DOM: the ground truth)
//   dsd      the whole page, declarative shadow DOM
//   scoped   the whole page, serializeShadowRoot 'scoped'
//   islands-dsd / islands-scoped   the page split into islands through stencilEngine({ islands })
// and compare the DOM each ends with (`sig`, the spike's signature, ids and island marks left out), the first difference, and the computed
// display of every host.
//   node spike/islands/scoped-truth.mjs [list-50,kitchen-sink,stress]
import { join } from 'node:path';
import { stencilEngine } from '../../../../express.js';
import { hydrationReport } from './islands.mjs';
import { client } from './clients.mjs';
import { HYDRATE, PAGES, launch, renderOptions, serve, MODES } from './lib.mjs';
import { writeViews } from './views.mjs';

const names = (process.argv[2] ?? 'list-50,kitchen-sink').split(',');
const dir = writeViews(names);
const engines = {};
for (const mode of ['dsd', 'scoped']) engines[mode] = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES[mode]), islands: {} });
const render = (e, file) => new Promise((ok, no) => e(file, {}, (err, h) => (err ? no(err) : ok(h))));
const browser = await launch();
const out = [];
for (const name of names) {
  const variants = {
    client: PAGES[name].full(),
    dsd: await render(engines.dsd, join(dir, `${name}.full.html`)),
    scoped: await render(engines.scoped, join(dir, `${name}.full.html`)),
    'islands-dsd': await render(engines.dsd, join(dir, `${name}.html`)),
    'islands-scoped': await render(engines.scoped, join(dir, `${name}.html`)),
  };
  const reports = {};
  for (const [label, html] of Object.entries(variants)) {
    const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: client.dir });
    reports[label] = await hydrationReport(browser, origin, html, '/', client.boot);
    server.close();
  }
  for (const [label, r] of Object.entries(reports)) out.push({ page: name, label, ready: r.ready, sameAsClient: r.sig === reports.client.sig, sameAsFull: r.sig === reports[label.includes('scoped') ? 'scoped' : 'dsd'].sig, notHydrated: r.hostsNotHydrated, dupIds: r.duplicateDomIds, sigLen: r.sig.length, clicks: JSON.stringify(r.interaction) });
  globalThis.REPORTS ??= {};
  REPORTS[name] = reports;
}
console.table(out);
if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify(REPORTS));
await browser.close();
await Promise.all(Object.values(engines).map((e) => e.close()));
