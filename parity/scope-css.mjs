// stencilrs' scopeCss against Stencil v5's own, byte for byte.
//
//   node scope-css.mjs [--verbose] [--fuzz N]
//
// Stencil does not export `scopeCss`, so its `shadow-css.ts` region is lifted out of the
// runtime bundle. Inputs: the cases in Stencil's own spec (`scope-css/stencil-spec.json`,
// recorded from `src/utils/test/scope-css.spec.ts`), every stylesheet in the repo, and
// generated CSS built from the selectors the shim treats specially (seeded, so repeatable).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { scopeCss } from '../index.js';
import { root } from './lib.mjs';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const fuzzCount = Number(args[args.indexOf('--fuzz') + 1]) || (args.includes('--fuzz') ? 0 : 5000);

const stencilScopeCss = (() => {
  const bundle = readFileSync(join(root, 'node_modules/@stencil/core/dist/runtime/index.js'), 'utf8');
  const start = bundle.indexOf('const escapeRegExpSpecialCharacters');
  const end = bundle.indexOf('//#region', bundle.indexOf('//#region src/utils/shadow-css.ts') + 1);
  if (start < 0 || end < start || !bundle.slice(start, end).includes('const scopeCss =')) {
    throw new Error('scopeCss not found in the @stencil/core runtime bundle; has its layout changed?');
  }
  return new Function(`${bundle.slice(start, end)}\nreturn scopeCss;`)();
})();

/** @type {{ name: string, css: string, scopeId: string, comment: boolean }[]} */
const cases = [];

const spec = JSON.parse(readFileSync(join(root, 'scope-css/stencil-spec.json'), 'utf8'));
spec.forEach(([css, scopeId, comment], i) => cases.push({ name: `spec #${i}`, css, scopeId, comment }));

const repo = join(root, '..');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.') || name === 'target' || name === 'dist') return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : [];
  });
for (const dir of ['examples', 'parity/fixtures', 'storybook']) {
  for (const file of walk(join(repo, dir))) {
    const css = readFileSync(file, 'utf8');
    for (const comment of [false, true]) {
      cases.push({ name: `${file.slice(repo.length + 1)}${comment ? ' (runtime)' : ''}`, css, scopeId: 'sc-my-cmp', comment });
    }
  }
}

// Generated CSS: a seeded PRNG (mulberry32) over the shim's special cases.
let seed = 0x5eed;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const compounds = [
  'a', 'div', '.b', '#c', '*', 'p.x', 'span[dir]', '[href$=\'.pdf\']', '[data-x="a b"]', '[part~="p"]',
  ':host', ':host(.on)', ':host([open])', ':host(:hover)', ':host(.a, .b)', ':HOST', ':host-context(.dark)',
  ':host-context([dir=rtl])', '::slotted(span)', '::slotted(*)', '::slotted(.a.b)', '::slotted()',
  'li:nth-child(2n + 1)', ':nth-of-type(odd)', ':is(a b)', ':not(.x, .y)', ':where(.w)', 'a:hover',
  'b::before', 'x::part(label)', 'y::part(a b):hover', '::part(icon)', 'ä', '\u017f', '\u212a', '.\\31 0', 'a\\:b',
  'sc-my-cmp', 'sc-my-cmp.k', 'sc-a.b', 'sc-aXb', 'sc-xx', 'a.k', '__ph-9__', '$&', 'u$\'v', ':hostname', '::shadow', '::content', '>*',
];
const combinators = [' ', ' ', '>', ' > ', '+', ' ~ ', '~', '\n', '\r\n', '\r', '\u2028', '\t', '\u00a0', '\ufeff', '  '];
const selector = () => {
  let s = pick(compounds);
  for (let n = Math.floor(rand() * 3); n > 0; n--) s += pick(combinators) + pick(compounds);
  return s;
};
const selectorList = () => {
  let s = selector();
  for (let n = Math.floor(rand() * 2.5); n > 0; n--) s += pick([',', ', ', ',\n', ' ,']) + selector();
  return s;
};
const decls = () => pick(['color: red;', 'margin:0', 'content: "}{"', '--v: a;b: c', '']);
const rule = (depth) => {
  const r = rand();
  if (depth < 2 && r < 0.12) return `@media (min-width: 1px) {${rules(depth + 1)}}`;
  if (depth < 2 && r < 0.18) return `@supports selector(${pick(compounds)}) {${rules(depth + 1)}}`;
  if (depth < 2 && r < 0.22) return `@layer base {${rules(depth + 1)}}`;
  if (r < 0.25) return '@keyframes spin { from { a: b } to { c: d } }';
  if (r < 0.27) return '@import url("x.css");';
  if (r < 0.3) return '/* a comment */';
  if (r < 0.31) return '/*# sourceMappingURL=x.css.map */';
  return `${selectorList()}${pick([' ', '', '\n'])}{${decls()}}`;
};
const rules = (depth) => Array.from({ length: 1 + Math.floor(rand() * 4) }, () => rule(depth)).join(pick(['', '\n', ' ']));
for (let i = 0; i < fuzzCount; i++) {
  cases.push({ name: `generated #${i}`, css: rules(0), scopeId: pick(['sc-my-cmp', 'sc-my-cmp', 'sc-my-cmp-ios', 'a', 'sc-a.b', 'sc-x+']), comment: rand() < 0.3 });
}
// Noise: strings of the characters the matchers treat specially, in any order.
const atoms = ['a', 'b', ':', '::', '\\', ' ', ' ', '\n', ' ', ';', '{', '}', '{%BLOCK%', '%BLOCK%', '-shadowcsshost', ':host', '[', ']', '>', '~', '+', ',', '__ph-1__', '__part-0__', '[is=x]', ':nth-child(2)', 'part~="a"'];
for (let i = 0; i < fuzzCount; i++) {
  let css = '';
  for (let n = 1 + Math.floor(rand() * 14); n > 0; n--) css += pick(atoms);
  cases.push({ name: `noise #${i}`, css, scopeId: pick(['sc-my-cmp', 'sc-a.b']), comment: rand() < 0.3 });
}

let failed = 0;
for (const c of cases) {
  let expected;
  try {
    expected = stencilScopeCss(c.css, c.scopeId, c.comment);
  } catch (e) {
    expected = "<error>";
  }
  let actual;
  try {
    actual = scopeCss(c.css, c.scopeId, c.comment);
  } catch (e) {
    actual = "<error>";
  }
  if (actual !== expected) {
    failed++;
    if (verbose || failed <= 5) {
      console.log(`✗ ${c.name} (${c.scopeId}${c.comment ? ', commentOriginalSelector' : ''})`);
      console.log(`  input:    ${JSON.stringify(c.css)}`);
      console.log(`  stencil:  ${JSON.stringify(expected)}`);
      console.log(`  stencilrs: ${JSON.stringify(actual)}`);
    }
  }
}
console.log(`scopeCss: ${cases.length - failed}/${cases.length} identical to Stencil v5`);
process.exit(failed ? 1 : 0);
