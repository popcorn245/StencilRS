// Q1 of the islands spike: do Stencil's hydration ids collide across islands rendered separately, and does the page still hydrate?
//
//   node spike/islands/hydrate-check.mjs [list-50|kitchen-sink] [dsd|scoped]
//
// Strategies for the same page (shell with `<stencil-island>` markers rendered as a document, islands rendered as fragments):
//   full          the current engine: one renderToString of the whole page
//   seq           islands rendered one after the other in this process (Stencil's host-id counter is module level, so it keeps counting)
//   collide       islands rendered with the counter reset before each (what two worker threads or two processes do)
//   collide+fix   as collide, with a per-island id base (idBase patch, see docs/spike-islands.md)
import { splice, renderShell, renderIsland, hydrationReport, idsOf } from './islands.mjs';
import { PAGES, MODES, loadHydrate, renderOptions, serve, launch, hydrateHref } from './lib.mjs';

const pageName = process.argv[2] ?? 'list-50';
const modeName = process.argv[3] ?? 'dsd';
const page = PAGES[pageName];
const hydrate = await loadHydrate();
const fixed = await import(hydrateHref.replace(/index\.js$/, 'index.idbase.js')); // node make-idbase-hydrate.mjs
const mode = MODES[modeName];
const opts = renderOptions(mode);

const strategies = {
  full: async () => (await hydrate.renderToString(page.full(), { ...opts, fullDocument: true })).html,
  seq: async () => {
    const shell = await renderShell(hydrate, page, opts);
    const parts = {};
    for (const name of Object.keys(page.islands)) parts[name] = await renderIsland(hydrate, page, name, opts);
    return splice(shell, parts);
  },
  collide: async () => {
    hydrate.resetSsrDocData();
    const shell = await renderShell(hydrate, page, opts);
    const parts = {};
    for (const name of Object.keys(page.islands)) {
      hydrate.resetSsrDocData();
      parts[name] = await renderIsland(hydrate, page, name, opts);
    }
    return splice(shell, parts);
  },
  'collide+fix': async () => {
    // every render starts its own counter (a worker thread or a fresh process would); the offset keeps the ranges apart
    const shell = await renderShell(fixed, page, { ...opts, idBase: 0 });
    const parts = {};
    for (const [k, name] of Object.keys(page.islands).entries()) parts[name] = await renderIsland(fixed, page, name, { ...opts, idBase: (k + 1) * 10000 });
    return splice(shell, parts);
  },
};

const browser = await launch();
const reports = [];
for (const [name, build] of Object.entries(strategies)) {
  const html = await build();
  const ids = idsOf(html);
  const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) });
  const report = await hydrationReport(browser, origin, html);
  server.close();
  reports.push({ name, html, ids, report });
}
await browser.close();
const diff = (a, b) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a === b ? null : { at: i, a: a.slice(Math.max(0, i - 100), i + 140), b: b.slice(Math.max(0, i - 100), i + 140) };
};
const full = reports[0].report;
const seq = reports[1].report;
const rows = reports.map(({ name, html, ids, report }) => {
  const { sig, sigNoCtx, ...rest } = report;
  if (process.env.SHOW_DIFF && name !== 'full') console.error(name, 'vs full', JSON.stringify(diff(full.sig, sig)));
  return { strategy: name, bytes: html.length, hostIds: ids.hosts, duplicateHostIds: ids.duplicateHosts, sameDomAsFull: sig === full.sig, sameDomAsFullIgnoringListContext: sigNoCtx === full.sigNoCtx, sameDomAsSeq: sig === seq.sig, ...rest };
});
console.log(JSON.stringify({ page: pageName, mode: modeName, rows }, null, 2));
