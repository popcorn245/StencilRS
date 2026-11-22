// Profiling driver for docs/profile-ssr.md: renders one page and mode N times from a hydrate app, to be run under
// `node --cpu-prof`, `--trace-gc` or `--heap-prof`; summarizes a `.cpuprofile` with `--summarize`.
//   node --cpu-prof --cpu-prof-dir=/tmp/p ssr-bench/profile.mjs dist/hydrate-stencilrs/index.js list-50 dsd 60
//   node ssr-bench/profile.mjs --summarize /tmp/p/CPU.xxx.cpuprofile [topN]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { PAGES, renderOptions } from '../ssr-pages.mjs';

const args = process.argv.slice(2);
if (args[0] === '--summarize') {
  const prof = JSON.parse(readFileSync(args[1], 'utf8'));
  const top = Number(args[2] ?? 40);
  const byId = new Map(prof.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = prof.timeDeltas;
  prof.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)));
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const agg = new Map();
  for (const [id, t] of self) {
    const { functionName, url, lineNumber } = byId.get(id).callFrame;
    const key = `${functionName || '(anonymous)'} ${url.split('/').slice(-2).join('/')}:${lineNumber + 1}`;
    agg.set(key, (agg.get(key) ?? 0) + t);
  }
  for (const [k, t] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${((t / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
} else {
  const [file, page, mode, n = '60'] = args;
  const { renderToString } = await import(pathToFileURL(resolve(file)).href);
  const options = renderOptions(mode === 'dsd' ? 'declarative-shadow-dom' : mode);
  for (let i = 0; i < 5; i++) await renderToString(PAGES[page], options);
  for (let i = 0; i < Number(n); i++) await renderToString(PAGES[page], options);
}
