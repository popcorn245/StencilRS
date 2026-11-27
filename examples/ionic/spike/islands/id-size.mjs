// What the id offset costs in bytes: the same islands rendered with a stride of 0 (colliding), 1000, 10000 and 100000 between ranges.
//   node spike/islands/id-size.mjs
import { gzipSync } from 'node:zlib';
import { PAGES, MODES } from './lib.mjs';
import { assemble, idbaseHref } from './assemble.mjs';
import { renderIsland, renderShell, splice } from './islands.mjs';

const h = await import(idbaseHref);
for (const pageName of ['list-50', 'kitchen-sink']) {
  for (const modeName of ['dsd', 'scoped']) {
    const page = PAGES[pageName];
    const opts = { prettyHtml: false, serializeShadowRoot: MODES[modeName], buildId: 'islands-spike' };
    const row = [];
    for (const stride of [0, 1000, 10000, 100000]) {
      const shell = await renderShell(h, page, { ...opts, idBase: 0 });
      const parts = {};
      for (const [k, name] of Object.keys(page.islands).entries()) parts[name] = await renderIsland(h, page, name, { ...opts, idBase: stride * (k + 1) });
      const html = splice(shell, parts);
      row.push(`stride ${stride}: ${html.length} B, gzip ${gzipSync(html).length} B`);
    }
    console.log(pageName, modeName, '|', row.join(' | '));
  }
}
