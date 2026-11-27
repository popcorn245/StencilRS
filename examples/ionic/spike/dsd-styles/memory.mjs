// Renderer memory of each variant: a fresh Chromium per sample (so no cache or process is shared), resident set (VmRSS of the
// renderer processes, from /proc) after about:blank and after the page has loaded and settled, and the page's DOM counters.
// Coarse (RSS has allocator and OS noise): n samples, interleaved, median and range of the delta.
//   node spike/dsd-styles/memory.mjs <variantsDir> [--runs 7] [--pages list-50,kitchen-sink] [--variants a-inline,b-link,...]
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const dir = argv[0];
const opt = (n, d) => (argv.indexOf(`--${n}`) < 0 ? d : argv[argv.indexOf(`--${n}`) + 1]);
const RUNS = Number(opt('runs', 7));
const PAGES = opt('pages', 'list-50,kitchen-sink').split(',');
const VARIANTS = opt('variants', 'a-inline,b-link,d-scoped').split(',');
const CHROME_ARGS = (process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean);
const types = { '.html': 'text/html', '.css': 'text/css' };
const server = createServer((req, res) => {
  const path = join(dir, req.url.split('?')[0]);
  if (!path.startsWith(dir) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain', 'content-encoding': 'gzip' }).end(gzipSync(readFileSync(path)));
});
await new Promise((r) => server.listen(0, r));
const rss = (pid) => {
  try {
    return Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024; // MB
  } catch {
    return 0;
  }
};
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

async function sample(variant, page) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', ...CHROME_ARGS] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p = await ctx.newPage();
    const root = await browser.newBrowserCDPSession();
    const renderers = async () => (await root.send('SystemInfo.getProcessInfo')).processInfo.filter((x) => x.type === 'renderer').map((x) => x.id);
    await p.goto('about:blank');
    await p.waitForTimeout(500);
    const before = (await renderers()).reduce((n, id) => n + rss(id), 0);
    await p.goto(`http://localhost:${server.address().port}/${variant}/${page}.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const after = (await renderers()).reduce((n, id) => n + rss(id), 0);
    const cdp = await ctx.newCDPSession(p);
    const dom = await cdp.send('Memory.getDOMCounters');
    return { delta: after - before, nodes: dom.nodes, listeners: dom.jsEventListeners };
  } finally {
    await browser.close();
  }
}

const out = {};
for (const page of PAGES) {
  for (const v of VARIANTS) out[`${page}/${v}`] = [];
  for (let r = 0; r < RUNS; r++) for (const v of VARIANTS) out[`${page}/${v}`].push(await sample(v, page));
  for (const v of VARIANTS) {
    const xs = out[`${page}/${v}`].map((s) => s.delta);
    console.log(`${page.padEnd(13)} ${v.padEnd(10)} renderer RSS +${median(xs).toFixed(1)} MB (${Math.min(...xs).toFixed(1)}-${Math.max(...xs).toFixed(1)}), DOM nodes ${out[`${page}/${v}`][0].nodes}`);
  }
}
server.close();
