// scopeCss speed: stencilrs against Stencil's JS, on the ui-kit's stylesheets.
//
//   node bench-scope-css.mjs [rounds=15]
//
// Two inputs: the stylesheets as written, and as lightningcss minifies them (what the Vite
// plugin hands to scopeCss). Median of the rounds, after a warm-up round.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

import { scopeCss } from '../index.js';
import { root } from './lib.mjs';

const rounds = Number(process.argv[2] ?? 15);

const stencilScopeCss = (() => {
  const bundle = readFileSync(join(root, 'node_modules/@stencil/core/dist/runtime/index.js'), 'utf8');
  const start = bundle.indexOf('const escapeRegExpSpecialCharacters');
  const end = bundle.indexOf('//#region', bundle.indexOf('//#region src/utils/shadow-css.ts') + 1);
  return new Function(`${bundle.slice(start, end)}\nreturn scopeCss;`)();
})();

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(join(root, '../examples/ui-kit/src')).filter((f) => f.endsWith('.css'));
const raw = files.map((f) => readFileSync(f, 'utf8'));
let minified = raw;
try {
  const { transform } = createRequire(join(root, '../package.json'))('lightningcss');
  minified = files.map((f) => transform({ filename: f, code: Buffer.from(readFileSync(f)), minify: true }).code.toString());
} catch {
  console.log('(lightningcss not installed: minified input skipped)');
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const time = (fn, inputs) => {
  const ts = [];
  for (let r = 0; r <= rounds; r++) {
    const t = performance.now();
    for (const css of inputs) fn(css, 'sc-my-cmp', false);
    ts.push(performance.now() - t);
  }
  return median(ts.slice(1));
};

for (const [name, inputs] of [['as written', raw], ['minified', minified]]) {
  if (inputs === raw && name !== 'as written') continue;
  const js = time(stencilScopeCss, inputs);
  const rs = time(scopeCss, inputs);
  const kb = inputs.reduce((n, c) => n + c.length, 0) / 1024;
  console.log(`${name.padEnd(10)} ${inputs.length} stylesheets, ${kb.toFixed(0)} KB: JS ${js.toFixed(1)} ms, stencilrs ${rs.toFixed(1)} ms (${(js / rs).toFixed(1)}x)`);
}
