// Issue #191 on Ionic: list-50 and kitchen-sink split into `<stencil-island>`s, rendered through `stencilEngine({ workers: 2, islands })`,
// hydrate in Chromium to the same DOM as the page rendered whole (same engine without `islands`, the marker-free view).
//
//   node check/islands.mjs [list-50,kitchen-sink]      (after `npm run build:hydrate` and the client build, see docs/spike-islands.md)
//
// Exit code 1 when a page does not hydrate like the full render. `sameDom` is the strict signature; `sameDomIgnoringListContext` leaves out
// what an island cannot know without its `ion-list` (`in-list`, `role`, `hidden` on `ion-item`: the client adds them on hydration).
import { join } from 'node:path';

import { stencilEngine } from '../../../express.js';
import { hydrationReport, idsOf } from '../spike/islands/islands.mjs';
import { HYDRATE, PAGES, launch, renderOptions, serve, MODES } from '../spike/islands/lib.mjs';
import { writeViews } from '../spike/islands/views.mjs';

const names = (process.argv[2] ?? 'list-50,kitchen-sink').split(',');
const dir = writeViews(names);
const options = renderOptions(MODES.dsd);
const plain = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options });
const islands = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options, islands: {} });
await Promise.all([plain.ready, islands.ready]);
const render = (engine, file) => new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));

const browser = await launch();
const rows = [];
let failed = false;
for (const name of names) {
  let full;
  for (const [label, engine, file] of [['full', plain, `${name}.full.html`], ['islands', islands, `${name}.html`]]) {
    const html = await render(engine, join(dir, file));
    const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) });
    const { sig, sigNoCtx, ...report } = await hydrationReport(browser, origin, html);
    server.close();
    full ??= { sig, sigNoCtx, styleTagsAfter: report.styleTagsAfter };
    const ids = idsOf(html);
    const row = {
      page: name,
      render: label,
      bytes: html.length,
      hostIds: ids.hosts,
      duplicateHostIds: ids.duplicateHosts,
      islandRoots: (html.match(/ data-island="/g) ?? []).length,
      sameDom: sig === full.sig,
      sameDomIgnoringListContext: sigNoCtx === full.sigNoCtx,
      ready: report.ready,
      hostsNotHydrated: report.hostsNotHydrated,
      lost: report.lost,
      styleTagsBefore: report.styleTagsBefore,
      styleTagsAfter: report.styleTagsAfter,
      errors: report.errors.length,
      clicks: JSON.stringify(report.interaction),
    };
    rows.push(row);
    if (label === 'islands' && !(row.sameDomIgnoringListContext && row.ready === 'ready' && row.duplicateHostIds === 0 && row.hostsNotHydrated === 0 && row.styleTagsAfter === full.styleTagsAfter)) failed = true;
  }
}
await browser.close();
await Promise.all([plain.close(), islands.close()]);
console.table(rows.map(({ clicks, ...r }) => r));
for (const r of rows) console.log(r.page, r.render, r.clicks);
if (failed) {
  console.error('FAILED: an islands page does not hydrate like the full render');
  process.exit(1);
}
