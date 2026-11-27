// The happy-dom renderer's output for every page of test/string-fixtures.mjs, as JSON on stdout. A child process,
// because the DOM renderer installs window globals and one runtime instance serves one window.
//   node test/string-oracle.mjs <urls: JSON array of component module URLs>
import { createRenderer } from '../runtime-server.js';
import { PAGES } from './string-fixtures.mjs';

const urls = JSON.parse(process.argv[2]);
const render = await createRenderer(() => Promise.all(urls.map((u) => import(u))));
const out = [];
for (const [, html, opts] of PAGES) out.push(await render(html, opts));
process.stdout.write(JSON.stringify(out));
process.exit(0);
