// Issues #191 and #192 on Ionic: list-50 and kitchen-sink split into `<stencil-island>`s, rendered through `stencilEngine({ workers: 2, islands })`,
// hydrate in Chromium to the same DOM as the page rendered whole (same engine without `islands`, the marker-free view).
//
//   node check/islands.mjs [list-50,kitchen-sink]      (after `npm run build:hydrate` and the client build, see docs/spike-islands.md)
//
// Besides `res.render`, each page is also streamed through `streamView` (gzip on) in every mode: in order, early head, out of order and
// out of order with a CSP nonce; each must hydrate to the same DOM as the whole-page render.
//
// Exit code 1 when a page does not hydrate like the full render. `sameDom` is the strict signature; `sameDomIgnoringListContext` leaves out
// what an island cannot know without its `ion-list` (`in-list`, `role`, `hidden` on `ion-item`: the client adds them on hydration).
import { join } from 'node:path';

import { stencilEngine, streamView } from '../../../express.js';
import { hydrationReport, idsOf } from '../spike/islands/islands.mjs';
import { HYDRATE, PAGES, launch, renderOptions, serve, MODES } from '../spike/islands/lib.mjs';
import { writeViews } from '../spike/islands/views.mjs';

const names = (process.argv[2] ?? 'list-50,kitchen-sink').split(',');
const dir = writeViews(names);
const options = renderOptions(MODES.dsd);
const plain = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options });
const islands = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options, islands: {} });
const early = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options, islands: { earlyHead: true } });
await Promise.all([plain.ready, islands.ready, early.ready]);
const app = { locals: {}, enabled: () => false, get: () => undefined };
// streamView as the route handler of a bare http server (the app is the few members the handler reads)
const streamed = (engine, file, opts) => {
  const handler = streamView(engine, file, {}, { compress: true, ...opts });
  return (req, res) => ((req.app = app), (res.locals = {}), handler(req, res, (err) => res.writeHead(500).end(String(err))));
};
const STREAMS = [
  ['stream in-order', islands, {}],
  ['stream early', early, {}],
  ['stream out-of-order', islands, { mode: 'out-of-order' }],
  ['stream early out-of-order', early, { mode: 'out-of-order' }],
  ['stream ooo + nonce', islands, { mode: 'out-of-order', nonce: 'Zm9v' }],
];
const render = (engine, file) => new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));

const browser = await launch();
const rows = [];
let failed = false;
for (const name of names) {
  let full;
  for (const [label, engine, file, streamOptions] of [['full', plain, `${name}.full.html`], ['islands', islands, `${name}.html`], ...STREAMS.map(([l, e, o]) => [l, e, `${name}.html`, o])]) {
    let html;
    let handler;
    if (streamOptions) handler = streamed(engine, join(dir, file), streamOptions);
    else {
      html = await render(engine, join(dir, file));
      handler = (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    }
    const { server, origin } = await serve({ '/': handler });
    html ??= await (await fetch(origin)).text();
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
    if (label !== 'full' && !(row.sameDomIgnoringListContext && row.ready === 'ready' && row.duplicateHostIds === 0 && row.hostsNotHydrated === 0 && (streamOptions || row.styleTagsAfter === full.styleTagsAfter))) failed = true; // a stream writes island styles in the body, which the client copies to <head>: more style tags, same DOM
  }
}
await browser.close();
await Promise.all([plain.close(), islands.close(), early.close()]);
console.table(rows.map(({ clicks, ...r }) => r));
for (const r of rows) console.log(r.page, r.render, r.clicks);
if (failed) {
  console.error('FAILED: an islands page does not hydrate like the full render');
  process.exit(1);
}
