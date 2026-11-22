// Child process of bench-ssr.mjs, the timing step: one row in a fresh process, so module load and the first render are
// cold and nothing is shared with another row. Prints one JSON object on its last line.
//   node ssr-bench/render.mjs <hydrate.js> <warmup> <renders>
//
//   loadMs         `import()` of the hydrate app (parse, evaluate): cold
//   firstRenderMs  the very first renderToString of the process (fragment, first mode): cold
//   per page and mode: `first` (first render of that combination), then `warmup` untimed renders, then `renders`
//   timed ones: median and p95 ms/render, and the size of the HTML in bytes
//   rssMb          resident set size at the end (peak over the run: process.resourceUsage().maxRSS)
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { renderOptions } from '../ssr-pages.mjs';
import { selectedModes, selectedPages } from './select.mjs';

const [file, warmupArg, rendersArg] = process.argv.slice(2);
const warmup = Number(warmupArg);
const renders = Number(rendersArg);

const t0 = performance.now();
const { renderToString } = await import(pathToFileURL(file).href);
const loadMs = performance.now() - t0;

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
const timed = async (page, options) => {
  const t = performance.now();
  const result = await renderToString(page, options);
  return [performance.now() - t, result];
};

let firstRenderMs = null;
const results = {};
for (const mode of selectedModes) {
  for (const [name, page] of selectedPages) {
    const options = renderOptions(mode);
    const [first, result] = await timed(page, options);
    firstRenderMs ??= first;
    for (let i = 0; i < warmup; i++) await renderToString(page, options);
    const samples = [];
    for (let i = 0; i < renders; i++) samples.push((await timed(page, options))[0]);
    samples.sort((a, b) => a - b);
    results[`${name}.${mode}`] = {
      firstMs: first,
      medianMs: quantile(samples, 0.5),
      p95Ms: quantile(samples, 0.95),
      minMs: samples[0],
      htmlBytes: Buffer.byteLength(result.html),
    };
  }
}
const mb = (n) => Math.round((n / 2 ** 20) * 10) / 10;
console.log(JSON.stringify({ loadMs, firstRenderMs, rssMb: mb(process.memoryUsage().rss), peakRssMb: mb(process.resourceUsage().maxRSS * 1024), results }));
