// Issue #190 on the Ionic app: islands rendered through `stencilEngine({ workers: 2 }).renderFragment` with distinct `idBase`, spliced into
// the page, hydrate in Chromium to the same DOM as the page rendered in one go. The control row leaves `idBase` out.
//
//   node spike/islands/idbase-engine.mjs [list-50,kitchen-sink] [dsd,scoped]     (after `npm run build:hydrate` and the client build, see docs/spike-islands.md)
//
// Per page and mode: `full` (one render, `idBase: 0` = what a fresh process gives), `seq` (one thread, no idBase: the spike's reference), `islands` (shell on idBase 0, island i on (i + 1) * 10000, on two
// worker threads), `colliding` (the same without idBase: every worker counts from 0, so two threads' islands share ids).
import { stencilEngine } from '../../../../express.js';
import { hydrationReport, idsOf, splice } from './islands.mjs';
import { HYDRATE, MODES, PAGES, launch, renderOptions, serve } from './lib.mjs';

const pages = (process.argv[2] ?? 'list-50,kitchen-sink').split(',');
const modes = (process.argv[3] ?? 'dsd,scoped').split(',');
const pool = stencilEngine({ hydrate: HYDRATE, workers: 2 });
await pool.ready;
const inproc = stencilEngine({ hydrate: HYDRATE }); // one thread: the counter just keeps counting, so no collisions (the spike's `seq`)
const browser = await launch();

const styleTags = (styles, shell) => styles.filter((s) => s.id && !shell.includes(`sty-id="${s.id}"`)).map((s) => `<style sty-id="${s.id}">${s.content}</style>`);

const strategies = {
  full: (page, opts) => pool.renderFragment(page.full(), { ...opts, fullDocument: true, idBase: 0 }).then((r) => r.html),
  seq: (page, opts) => assemble(page, opts, () => ({}), inproc),
  islands: (page, opts, bases = (k) => ({ idBase: (k + 1) * 10_000 })) => assemble(page, opts, bases),
  colliding: (page, opts) => assemble(page, opts, () => ({})),
};

async function assemble(page, opts, bases, engine = pool) {
  const names = Object.keys(page.islands);
  // shell and islands at once: with two workers the three renders are spread over both threads (in-process they run one after the other)
  const [shell, ...parts] = await Promise.all([
    engine.renderFragment(page.template, { ...opts, fullDocument: true, ...bases(-1) }),
    ...names.map((name, k) => engine.renderFragment(page.islands[name], { ...opts, fullDocument: false, ...bases(k) })),
  ]);
  const styles = styleTags(parts.flatMap((p) => p.styles), shell.html);
  const html = splice(shell.html, Object.fromEntries(names.map((n, k) => [n, parts[k].html])));
  return styles.length ? html.replace('</head>', `${styles.join('')}</head>`) : html;
}

const rows = [];
const diffAt = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return { at: i, a: a.slice(Math.max(0, i - 160), i + 160), b: b.slice(Math.max(0, i - 160), i + 160) }; };
for (const pageName of pages) {
  for (const modeName of modes) {
    const page = PAGES[pageName];
    const opts = renderOptions(MODES[modeName]);
    let full;
    let seq;
    for (const [name, build] of Object.entries(strategies)) {
      const html = await build(page, opts);
      const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) });
      const { sig, sigNoCtx, ...report } = await hydrationReport(browser, origin, html);
      server.close();
      full ??= { sig, sigNoCtx };
      if (name === 'seq') seq = sig;
      if (process.env.SHOW_DIFF && sig !== full.sig) console.error(name, JSON.stringify(diffAt(full.sig, sig)));
      const ids = idsOf(html);
      rows.push({ page: pageName, mode: modeName, strategy: name, bytes: html.length, hostIds: ids.hosts, duplicateHostIds: ids.duplicateHosts, sameDomAsFull: sig === full.sig, sameDomAsSeq: seq === undefined ? null : sig === seq, sameDomIgnoringListContext: sigNoCtx === full.sigNoCtx, ready: report.ready, hostsNotHydrated: report.hostsNotHydrated, lost: report.lost, interaction: report.interaction, errors: report.errors });
    }
  }
}
await browser.close();
await pool.close();
console.log(JSON.stringify(rows, null, 1));
