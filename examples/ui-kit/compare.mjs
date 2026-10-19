// Compare the ui-kit spec results: stencilrs vs Stencil v5's own compiler.
//
//   npm run test:stencil && npm test && node compare.mjs [--verbose]
//   node compare.mjs --spec-page   the results of `npm run test:spec-page[:stencil]` instead
//
// A test that passes with Stencil and fails with stencilrs is a stencilrs regression; one
// that fails with both is the spec, the harness or a Stencil v5 behaviour change.
import { readFileSync } from 'node:fs';

const verbose = process.argv.includes('--verbose');
const prefix = process.argv.includes('--spec-page') ? 'spec-page-' : '';
const load = (name) => JSON.parse(readFileSync(new URL(`./results/${prefix}${name}.json`, import.meta.url), 'utf8'));

const index = (report) => {
  const tests = new Map();
  const files = new Map();
  for (const file of report.testResults) {
    const rel = file.name.replace(/\\/g, '/').replace(/^.*\/examples\/ui-kit\//, '');
    files.set(rel, { status: file.status, message: file.message, count: file.assertionResults.length });
    for (const t of file.assertionResults) {
      tests.set(`${rel} › ${t.fullName}`, { status: t.status, message: (t.failureMessages ?? []).join('\n') });
    }
  }
  return { tests, files };
};

const stencil = index(load('stencil'));
const rs = index(load('stencilrs'));

const firstLine = (m) => (m ?? '').split('\n').find((l) => l.trim()) ?? '';

// Files that failed to load under one compiler only.
const fileOnly = [];
for (const [file, s] of stencil.files) {
  const r = rs.files.get(file);
  if (s.count > 0 && (!r || r.count === 0)) fileOnly.push(`${file}: ${firstLine(r?.message)}`);
}

const regressions = [];
const fixed = [];
let bothFail = 0;
let bothPass = 0;
for (const [name, s] of stencil.tests) {
  const r = rs.tests.get(name);
  if (!r) continue;
  if (s.status === 'passed' && r.status !== 'passed') regressions.push([name, firstLine(r.message)]);
  else if (s.status !== 'passed' && r.status === 'passed') fixed.push(name);
  else if (s.status === 'passed') bothPass++;
  else bothFail++;
}

const count = (idx) => [...idx.tests.values()].filter((t) => t.status === 'passed').length;
console.log(`Stencil v5:  ${count(stencil)}/${stencil.tests.size} tests pass`);
console.log(`stencilrs:   ${count(rs)}/${rs.tests.size} tests pass`);
console.log(`both pass ${bothPass} · both fail ${bothFail} · only stencilrs fails ${regressions.length} · only Stencil fails ${fixed.length}`);
if (fileOnly.length) {
  console.log(`\nSpec files that load with Stencil but not stencilrs (${fileOnly.length}):`);
  for (const f of fileOnly) console.log(`  ✗ ${f}`);
}
if (regressions.length) {
  console.log(`\nTests that pass with Stencil but fail with stencilrs (${regressions.length}):`);
  for (const [name, msg] of verbose ? regressions : regressions.slice(0, 40)) console.log(`  ✗ ${name}\n      ${msg}`);
}
if (fixed.length) {
  console.log(`\nTests that fail with Stencil but pass with stencilrs (${fixed.length}):`);
  for (const name of fixed) console.log(`  ✓ ${name}`);
}
process.exitCode = regressions.length || fileOnly.length ? 1 : 0;
