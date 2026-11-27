// Q4 correctness: every route of server.mjs, loaded in Chromium with the client bundle, must hydrate to the DOM the full render hydrates to.
//   node spike/islands/server.mjs 4177 2 dsd &   node spike/islands/stream-check.mjs 4177 [list-50|kitchen-sink] [?delay=...]
import { hydrationReport } from './islands.mjs';
import { launch } from './lib.mjs';

const [port, pageName = 'list-50', query = ''] = process.argv.slice(2);
const origin = `http://127.0.0.1:${port}`;
const browser = await launch();
const rows = [];
let base;
for (const route of ['full', 'noisl', 'inorder', 'early', 'ooo']) {
  const r = await hydrationReport(browser, origin, null, `/${route}/${pageName}${query}`);
  if (route === 'full') base = r;
  const { sig, sigNoCtx, ...rest } = r;
  if (process.env.SHOW_DIFF && route !== 'full' && sig !== base.sig) { let i = 0; while (base.sig[i] === sig[i]) i++; console.error(route, i, '\n full:', base.sig.slice(Math.max(0, i - 100), i + 250), '\n this:', sig.slice(Math.max(0, i - 100), i + 250)); }
  rows.push({ route, sameDomAsFull: sig === base.sig, ready: rest.ready, adopted: `${rest.adopted}/${rest.total}`, hostsNotHydrated: rest.hostsNotHydrated, styleTags: `${rest.styleTagsBefore}->${rest.styleTagsAfter}`, errors: rest.errors.length, interaction: rest.interaction });
}
await browser.close();
console.log(JSON.stringify(rows, null, 1));
