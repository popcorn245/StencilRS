// Runtime benchmark: the same components on Stencil's runtime and on the stencilrs runtime.
//   npx vite build --config bench/vite.stencil.config.ts
//   npx vite build --config bench/vite.stencilrs.config.ts
//   node bench/run.mjs [runs]
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const RUNS = Number(process.argv[2] ?? 15);
const here = import.meta.dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const serve = (dir) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      try {
        const body = readFileSync(path);
        res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, () => resolve(server));
  });

// Each case: a setup run untimed, then the timed operation. `work` is componentWillRender →
// componentDidRender of the table (render + DOM commit); `total` is call → that commit.
const CASES = {
  'create 1,000 rows': [null, 'run(1000)'],
  'replace 1,000 rows': ['run(1000)', 'run(1000)'],
  'update every 10th row': ['run(1000)', 'update()'],
  'select a row': ['run(1000)', 'select(500)'],
  'swap two rows': ['run(1000)', 'swap()'],
  'remove a row': ['run(1000)', 'remove(500)'],
  'create 10,000 rows': [null, 'run(10000)'],
  'append 1,000 to 1,000 rows': ['run(1000)', 'add(1000)'],
  'clear 1,000 rows': ['run(1000)', 'clear()'],
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};

async function measure(page, setup, op) {
  await page.evaluate(async (setup) => {
    const el = document.querySelector('bench-table');
    await el.componentOnReady();
    await el.clear();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    if (setup) await eval(`el.${setup}`);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
  }, setup);
  return page.evaluate(async (op) => {
    const el = document.querySelector('bench-table');
    window.__done = 0;
    const t = performance.now();
    await eval(`el.${op}`);
    while (!window.__done) await new Promise((r) => setTimeout(r, 0));
    // Wait for the frame to be produced too (style, layout, paint of the change).
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    return { work: window.__work, total: window.__done - t };
  }, op);
}

async function cells(page) {
  return page.evaluate(async () => {
    const host = document.getElementById('cells');
    host.innerHTML = '';
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    let t = performance.now();
    for (let i = 0; i < 1000; i++) {
      const c = document.createElement('bench-cell');
      c.label = `cell ${i}`;
      c.value = i;
      host.appendChild(c);
    }
    await Promise.all([...host.children].map((c) => c.componentOnReady()));
    const create = performance.now() - t;
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    t = performance.now();
    for (const c of host.children) c.value++;
    // Both runtimes render the change before the next frame.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    const last = host.lastElementChild.shadowRoot.querySelector('b').textContent;
    if (last !== '1000') throw new Error(`cells did not update (${last})`);
    return { create, update: performance.now() - t };
  });
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const results = {};
for (const runtime of ['stencil', 'stencilrs']) {
  const dir = join(here, `dist-${runtime}`);
  const js = readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js'));
  const bytes = js.reduce((n, f) => n + readFileSync(join(dir, 'assets', f)).length, 0);
  const gz = js.reduce((n, f) => n + gzipSync(readFileSync(join(dir, 'assets', f))).length, 0);
  const server = await serve(dir);
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  const r = { bytes, gz, cases: {} };
  for (const [name, [setup, op]] of Object.entries(CASES)) {
    const work = [], total = [];
    for (let i = 0; i < RUNS + 2; i++) {
      const m = await measure(page, setup, op);
      if (i >= 2) { work.push(m.work); total.push(m.total); } // 2 warm-up runs
    }
    r.cases[name] = { work: median(work), total: median(total) };
  }
  const c = [], u = [];
  for (let i = 0; i < Math.max(5, RUNS >> 1) + 1; i++) {
    const m = await cells(page);
    if (i) { c.push(m.create); u.push(m.update); }
  }
  r.cases['1,000 components: create'] = { total: median(c) };
  r.cases['1,000 components: change a prop on each'] = { total: median(u) };
  results[runtime] = r;
  await page.close();
  server.close();
}
await browser.close();

const fmt = (x) => (x == null ? '' : x.toFixed(1));
console.log(`| Case (median of ${RUNS}, ms) | Stencil work | stencilrs work | Stencil total | stencilrs total | total ratio |`);
console.log('|---|---:|---:|---:|---:|---:|');
for (const name of Object.keys(results.stencil.cases)) {
  const a = results.stencil.cases[name], b = results.stencilrs.cases[name];
  console.log(`| ${name} | ${fmt(a.work)} | ${fmt(b.work)} | ${fmt(a.total)} | ${fmt(b.total)} | ${(a.total / b.total).toFixed(2)}× |`);
}
console.log(`\nJS: Stencil ${results.stencil.bytes} B (${results.stencil.gz} B gzip), stencilrs ${results.stencilrs.bytes} B (${results.stencilrs.gz} B gzip)`);
