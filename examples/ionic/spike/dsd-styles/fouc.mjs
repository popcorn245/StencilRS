// FOUC check: serve the shared sheets (/c/) 1200 ms late, JavaScript off, and look at the page at 600 ms and at the end.
// Prints FCP, when the sheets arrived, and whether the 600 ms frame is blank / the final frame / something else (unstyled).
//   node spike/dsd-styles/fouc.mjs <variantsDir> <outDir> [page] [variants]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const [dir, outDir, page = 'list-50', variantsArg = 'a-inline,b-link,b-preload,b-block'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const DELAY = 1200;
const types = { '.html': 'text/html', '.css': 'text/css' };
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const path = join(dir, url);
  if (!existsSync(path)) return res.writeHead(404).end();
  const send = () => res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain', 'cache-control': 'no-store' }).end(readFileSync(path));
  if (url.startsWith('/c/')) setTimeout(send, DELAY);
  else send();
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const blank = await (async () => {
  const p = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const png = await p.screenshot();
  await p.close();
  return png;
})();
for (const v of variantsArg.split(',')) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 412, height: 915 } });
  const p = await ctx.newPage();
  const t0 = Date.now();
  p.goto(`http://localhost:${server.address().port}/${v}/${page}.html`, { waitUntil: 'commit' }).catch(() => {});
  await p.waitForTimeout(600);
  const early = await p.screenshot({ path: join(outDir, `fouc.${page}.${v}.600ms.png`) });
  await p.waitForTimeout(2200);
  const late = await p.screenshot({ path: join(outDir, `fouc.${page}.${v}.final.png`) });
  const m = await p.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime }));
  console.log(v.padEnd(10), 'at 600 ms:', early.equals(late) ? 'final frame (styled)' : early.equals(blank) ? 'blank (held for the sheets)' : 'painted, NOT the final frame (unstyled)', '| FCP', m.fcp?.toFixed(0), 'ms');
  await ctx.close();
}
await browser.close();
server.close();
