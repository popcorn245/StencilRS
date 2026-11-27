// Issues #191 and #192 on Ionic: list-50 and kitchen-sink split into `<stencil-island>`s, rendered through `stencilEngine({ workers: 2, islands })`,
// hydrate in Chromium to the same DOM as the page rendered whole (same engine without `islands`, the marker-free view).
//
//   node check/islands.mjs [list-50,kitchen-sink,app-menu,app-tabs] [dsd,scoped]     (after `npm run build:hydrate` and a client build, see below)
//
// Both serializations, `declarative-shadow-dom` and `scoped` (#206). The client that hydrates: `ISLANDS_CLIENT=stencil` is Stencil's own lazy-loader
// build (the spike's `stencil build --dev`, docs/spike-islands.md), `hydrate` the production `hydrateClient` build of the Vite plugin
// (`IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts`). Default: `hydrate`.
// A scoped page must be hydrated with the production client: the dev build puts a <style> in the shadow root before it hydrates, which Stencil's
// client takes for server-rendered shadow content and then leaves the page empty (docs/islands.md, scoped mode), for the whole-page render as much as for islands.
//
// Besides `res.render`, each page is also streamed through `streamView` (gzip on) in every mode: in order, early head, out of order and
// out of order with a CSP nonce; each must hydrate to the same DOM as the whole-page render.
//
// Exit code 1 when a page does not hydrate like the full render. `sameDom` is the strict signature; `sameDomIgnoringListContext` leaves out
// what an island cannot know without its `ion-list` (`in-list`, `role`, `hidden` on `ion-item`: the client adds them on hydration).
import { join } from 'node:path';

import { stencilEngine, streamView } from '../../../express.js';
import { CLIENTS } from '../spike/islands/clients.mjs';
import { hydrationReport, idsOf } from '../spike/islands/islands.mjs';
import { HYDRATE, PAGES, launch, renderOptions, serve, MODES } from '../spike/islands/lib.mjs';
import { writeViews } from '../spike/islands/views.mjs';

const names = (process.argv[2] ?? 'list-50,kitchen-sink,app-menu,app-tabs').split(',');
const modes = (process.argv[3] ?? 'dsd,scoped').split(',');
const client = CLIENTS[process.env.ISLANDS_CLIENT ?? 'hydrate'];
const dir = writeViews(names);
const hydrate = async (html) => {
  const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: client.dir });
  const report = await hydrationReport(browser, origin, html, '/', client.boot);
  server.close();
  return report;
};
const app = { locals: {}, enabled: () => false, get: () => undefined };
// streamView as the route handler of a bare http server (the app is the few members the handler reads)
const streamed = (engine, file, opts) => {
  const handler = streamView(engine, file, {}, { compress: true, ...opts });
  return (req, res) => ((req.app = app), (res.locals = {}), handler(req, res, (err) => res.writeHead(500).end(String(err))));
};
const render = (engine, file) => new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));

const browser = await launch();
const rows = [];
let failed = false;
for (const mode of modes) {
  const options = renderOptions(MODES[mode]);
  const plain = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options });
  const islands = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options, islands: {} });
  const early = stencilEngine({ hydrate: HYDRATE, workers: 2, renderOptions: options, islands: { earlyHead: true } });
  await Promise.all([plain.ready, islands.ready, early.ready]);
  const STREAMS = [
    ['stream in-order', islands, {}],
    ['stream early', early, {}],
    ['stream out-of-order', islands, { mode: 'out-of-order' }],
    ['stream early out-of-order', early, { mode: 'out-of-order' }],
    ['stream ooo + nonce', islands, { mode: 'out-of-order', nonce: 'Zm9v' }],
  ];
  for (const name of names) {
    // `client-only`: the markup as it is, no server render. The components build their own DOM: what the page is meant to come to.
    const clientOnly = await hydrate(PAGES[name].full());
    let full;
    for (const [label, engine, file, streamOptions] of [['full', plain, `${name}.full.html`], ['islands', islands, `${name}.html`], ...STREAMS.map(([l, e, o]) => [l, e, `${name}.html`, o])]) {
      let html;
      let handler;
      if (streamOptions) handler = streamed(engine, join(dir, file), streamOptions);
      else {
        html = await render(engine, join(dir, file));
        handler = (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
      }
      const { server, origin } = await serve({ '/': handler }, { clientDir: client.dir });
      html ??= await (await fetch(origin)).text();
      // A scoped page hydrates to one of two DOMs now and then, whole page or islands alike (about 1 in 10 on kitchen-sink: ion-tabs' light children come out in the
      // other order, a race in Stencil's client). So the reference is the DOM most of three hydrations of the full render come to, and a variant that is
      // not that DOM is hydrated again, twice at most; the attempts are reported.
      let attempts = 0;
      let got;
      if (!full) {
        const runs = [await hydrationReport(browser, origin, html, '/', client.boot), await hydrationReport(browser, origin, html, '/', client.boot), await hydrationReport(browser, origin, html, '/', client.boot)];
        got = runs.find((r) => runs.filter((o) => o.sigNoCtx === r.sigNoCtx).length >= 2) ?? runs[0];
        attempts = 1;
      }
      while (!got || (full && got.sigNoCtx !== full.sigNoCtx && attempts < 3)) {
        attempts++;
        got = await hydrationReport(browser, origin, html, '/', client.boot);
      }
      const { sig, sigNoCtx, ...report } = got;
      server.close();
      if (process.env.ISLANDS_DUMP_SIG) (await import('node:fs')).writeFileSync(`${process.env.ISLANDS_DUMP_SIG}-${name}-${mode}-${label.replace(/\W+/g, '_')}.sig`, sig);
      full ??= { sig, sigNoCtx, styleTagsAfter: report.styleTagsAfter };
      const ids = idsOf(html);
      const it = report.interaction;
      const clicked = it.toggles?.every((t) => t.before !== t.after && t.events.length >= 1) && (!it.checkbox || it.checkbox.before !== it.checkbox.after) && (!it.button || it.button.clicked === 1);
      const row = {
        page: name,
        mode,
        render: label,
        bytes: html.length,
        hostIds: ids.hosts,
        duplicateHostIds: ids.duplicateHosts,
        duplicateDomIds: report.duplicateDomIds,
        islandRoots: (html.match(/ data-island="/g) ?? []).length,
        sameDomAsFull: sig === full.sig,
        sameDomIgnoringListContext: sigNoCtx === full.sigNoCtx,
        sameDomAsClientOnly: sig === clientOnly.sig,
        attempts,
        ready: report.ready,
        hostsNotHydrated: report.hostsNotHydrated,
        lost: report.lost,
        styleTagsBefore: report.styleTagsBefore,
        styleTagsAfter: report.styleTagsAfter,
        errors: report.errors.length,
        clicksWork: Boolean(clicked),
        clicks: JSON.stringify(report.interaction),
      };
      rows.push(row);
      if (!row.clicksWork || row.duplicateDomIds || row.ready !== 'ready' || row.hostsNotHydrated) failed = true;
      if (label !== 'full' && !(row.sameDomIgnoringListContext && row.duplicateHostIds === 0 && (streamOptions || row.styleTagsAfter === full.styleTagsAfter))) failed = true; // a stream writes island styles in the body, which the client copies to <head>: more style tags, same DOM
    }
  }
  await Promise.all([plain.close(), islands.close(), early.close()]);
}
await browser.close();
console.table(rows.map(({ clicks, ...r }) => r));
for (const r of rows) console.log(r.page, r.mode, r.render, r.clicks);
if (failed) {
  console.error('FAILED: an islands page does not hydrate like the full render, or does not work');
  process.exit(1);
}
