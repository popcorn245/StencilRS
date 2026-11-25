// Runtime benchmark: the same components on Stencil's runtime, on the stencilrs runtime, and
// written for Qwik (bench/qwik, client-rendered).
//   npx vite build --config bench/vite.stencil.config.ts
//   npx vite build --config bench/vite.stencilrs.config.ts
//   (cd bench/qwik && npm install && npx vite build)   # optional: skipped when dist-qwik is missing
//   node bench/run.mjs [runs]
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

// Qwik has no lifecycle hook to time a render by: `total` is from the call to the last DOM
// mutation of the change (a MutationObserver), and there is no `work` column.
const FRAME = 'new Promise((r) => requestAnimationFrame(() => setTimeout(r)))';
async function measureQwik(page, setup, op) {
  await page.evaluate(async ([setup, FRAME]) => {
    while (!window.bench) await new Promise((r) => setTimeout(r, 10));
    window.bench.clear();
    await eval(FRAME);
    if (setup) eval(`window.bench.${setup}`);
    await eval(FRAME);
    await eval(FRAME);
  }, [setup, FRAME]);
  return page.evaluate(async ([op, FRAME]) => {
    let last = 0;
    const mo = new MutationObserver(() => (last = performance.now()));
    mo.observe(document.getElementById('app'), { subtree: true, childList: true, characterData: true, attributes: true });
    const t = performance.now();
    eval(`window.bench.${op}`);
    for (let i = 0; i < 100; i++) {
      const seen = last;
      await eval(FRAME);
      if (last && last === seen) break; // a frame with no further change
    }
    mo.disconnect();
    return { work: null, total: last - t };
  }, [op, FRAME]);
}

async function cellsQwik(page) {
  return page.evaluate(async (FRAME) => {
    window.bench.cells(0);
    await eval(FRAME);
    let t = performance.now();
    window.bench.cells(1000);
    while (document.querySelectorAll('#cells b').length < 1000) await new Promise((r) => setTimeout(r, 0));
    const create = performance.now() - t;
    await eval(FRAME);
    t = performance.now();
    window.bench.bump();
    const last = () => document.querySelector('#cells > div:last-child b').textContent;
    do await eval(FRAME);
    while (last() !== '1000');
    return { create, update: performance.now() - t };
  }, FRAME);
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

// stencilrs only (it renders on a microtask, so the work can be timed without waiting for a frame):
// the number 1,000 components show changes, by a prop on each (each renders) or by one signal
// passed to their templates (none renders). Script time until the DOM holds the new number.
async function live(page, liveUrl) {
  return page.evaluate(async (liveUrl) => {
    await import(liveUrl);
    const host = document.getElementById('cells');
    const fill = async (tag) => {
      host.innerHTML = '';
      for (let i = 0; i < 1000; i++) host.appendChild(Object.assign(document.createElement(tag), { label: `cell ${i}` }));
      await Promise.all([...host.children].map((c) => c.componentOnReady()));
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    };
    const shown = () => host.lastElementChild.shadowRoot.querySelector('b').textContent;
    await fill('bench-cell');
    let t = performance.now();
    for (const c of host.children) c.value = 7;
    await new Promise((r) => queueMicrotask(r));
    const prop = performance.now() - t;
    if (shown() !== '7') throw new Error(`cells did not update (${shown()})`);
    await fill('bench-live-cell');
    const next = String(window.benchTick.value + 1);
    t = performance.now();
    window.benchTick.value++;
    const signal = performance.now() - t;
    if (shown() !== next) throw new Error(`live cells did not update (${shown()})`);
    host.innerHTML = '';
    return { prop, signal };
  }, liveUrl);
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const results = {};
const runtimes = ['stencil', 'stencilrs', ...(existsSync(join(here, 'dist-qwik')) ? ['qwik'] : [])];
for (const runtime of runtimes) {
  const dir = join(here, `dist-${runtime}`);
  const qwik = runtime === 'qwik';
  const all = readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js'));
  const liveJs = all.find((f) => f.startsWith('live-'));
  const js = all.filter((f) => f !== liveJs);
  const bytes = js.reduce((n, f) => n + readFileSync(join(dir, 'assets', f)).length, 0);
  const gz = js.reduce((n, f) => n + gzipSync(readFileSync(join(dir, 'assets', f))).length, 0);
  const server = await serve(dir);
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  const r = { bytes, gz, cases: {} };
  for (const [name, [setup, op]] of Object.entries(CASES)) {
    const work = [], total = [];
    for (let i = 0; i < RUNS + 2; i++) {
      const m = qwik ? await measureQwik(page, setup, op) : await measure(page, setup, op);
      if (i >= 2) { work.push(m.work); total.push(m.total); } // 2 warm-up runs
    }
    r.cases[name] = { work: median(work), total: median(total) };
  }
  const c = [], u = [];
  for (let i = 0; i < Math.max(5, RUNS >> 1) + 1; i++) {
    const m = qwik ? await cellsQwik(page) : await cells(page);
    if (i) { c.push(m.create); u.push(m.update); }
  }
  r.cases['1,000 components: create'] = { total: median(c) };
  r.cases['1,000 components: change a prop on each'] = { total: median(u) };
  if (runtime === 'stencilrs') {
    const a = [], b = [];
    for (let i = 0; i < Math.max(5, RUNS >> 1) + 1; i++) {
      const m = await live(page, `/assets/${liveJs}`);
      if (i) { a.push(m.prop); b.push(m.signal); }
    }
    r.live = { prop: median(a), signal: median(b) };
  }
  results[runtime] = r;
  await page.close();
  server.close();
}
await browser.close();

const fmt = (x) => (x == null ? '' : x.toFixed(1));
const q = results.qwik;
console.log(`| Case (median of ${RUNS}, ms) | Stencil work | stencilrs work | Stencil total | stencilrs total |${q ? ' Qwik total |' : ''} Stencil ÷ stencilrs |${q ? ' Qwik ÷ stencilrs |' : ''}`);
console.log(`|---|---:|---:|---:|---:|${q ? '---:|' : ''}---:|${q ? '---:|' : ''}`);
for (const name of Object.keys(results.stencil.cases)) {
  const a = results.stencil.cases[name], b = results.stencilrs.cases[name], c = q?.cases[name];
  console.log(`| ${name} | ${fmt(a.work)} | ${fmt(b.work)} | ${fmt(a.total)} | ${fmt(b.total)} |${q ? ` ${fmt(c.total)} |` : ''} ${(a.total / b.total).toFixed(2)}× |${q ? ` ${(c.total / b.total).toFixed(2)}× |` : ''}`);
}
const size = (r) => `${r.bytes} B (${r.gz} B gzip)`;
console.log(`\nJS: Stencil ${size(results.stencil)}, stencilrs ${size(results.stencilrs)}${q ? `, Qwik ${size(q)} (every chunk, though Qwik loads them lazily)` : ''}`);
const l = results.stencilrs.live;
console.log(`\nstencilrs, 1,000 components show a new number (script ms): a prop on each ${l.prop.toFixed(2)}, one signal in their templates ${l.signal.toFixed(2)}`);
