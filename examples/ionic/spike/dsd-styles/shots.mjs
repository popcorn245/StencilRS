// Screenshot every variant of a page (JavaScript off, stylesheets loaded) and compare the PNG bytes with variant a.
//   node spike/dsd-styles/shots.mjs <variantsDir> <outDir> [page] [variants]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const [dir, outDir, page = 'list-50', variantsArg = 'a-inline,b-link,b-preload,c-module,d-scoped'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css' };
const server = createServer((req, res) => {
  const path = join(dir, req.url.split('?')[0]);
  if (!existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain' }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', ...(process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean)] });
let base;
for (const v of variantsArg.split(',')) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 412, height: 915 } });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${server.address().port}/${v}/${page}.html`, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  const png = await p.screenshot({ path: join(outDir, `${page}.${v}.png`) });
  base ??= png;
  console.log(v, png.length, png.equals(base) ? 'identical to first' : 'DIFFERENT');
  await ctx.close();
}
await browser.close();
server.close();
