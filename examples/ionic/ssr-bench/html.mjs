// Child process of bench-ssr.mjs, the equality step: render every page in every mode once with the row's hydrate app
// and write the HTML to <outDir>/<page>.<mode>.html. A fresh process per row, so no state is shared between rows.
//   node ssr-bench/html.mjs <hydrate.js> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderOptions } from '../ssr-pages.mjs';
import { selectedModes, selectedPages } from './select.mjs';

const [file, outDir] = process.argv.slice(2);
const { renderToString } = await import(pathToFileURL(file).href);
mkdirSync(outDir, { recursive: true });
const diagnostics = {};
for (const mode of selectedModes) {
  for (const [name, page] of selectedPages) {
    const result = await renderToString(page, renderOptions(mode));
    writeFileSync(join(outDir, `${name}.${mode}.html`), result.html);
    const errors = (result.diagnostics ?? []).filter((d) => d.level === 'error');
    if (errors.length) diagnostics[`${name}.${mode}`] = errors.map((d) => d.messageText);
  }
}
console.log(JSON.stringify({ diagnostics }));
