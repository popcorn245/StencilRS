// Compare stencilrs against the Stencil v5 snapshots.
//
//   node compare.mjs [suite] [--verbose]
//
// Metadata: Stencil's `data` is projected to the fields stencilrs produces today (FIELDS
// below grows as the port does) and compared exactly. Diagnostics: compared as sorted
// lists of `level: message`. Code: both outputs are reprinted by one printer (oxc codegen,
// comments dropped) and compared exactly, for fixtures Stencil compiles without errors.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalize, transpile } from '../index.js';
import { listFixtures, snapshotsDir, stencilrsOptions } from './lib.mjs';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const suite = args.find((a) => !a.startsWith('--'));

const nul = (v) => (v === undefined ? null : v);

const fromStencil = (c) => ({
  tagName: c.tagName,
  componentClassName: c.componentClassName,
  encapsulation: c.encapsulation,
  styleUrls: (c.styles ?? []).flatMap((s) => (s.externalStyles ?? []).map((e) => e.originalComponentPath)),
  properties: c.properties.map((p) => ({
    name: p.name,
    type: p.type,
    mutable: p.mutable,
    required: p.required,
    optional: p.optional,
    getter: p.getter,
    setter: p.setter,
    reflect: p.reflect,
    attribute: nul(p.attribute),
    defaultValue: nul(p.defaultValue),
    complexTypeOriginal: p.complexType?.original,
  })),
  states: c.states.map((s) => ({ name: s.name })),
  events: c.events.map((e) => ({ name: e.name, method: e.method, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed })),
  methods: c.methods.map((m) => ({ name: m.name })),
  listeners: c.listeners.map((l) => ({ name: l.name, method: l.method, target: nul(l.target), capture: l.capture, passive: l.passive })),
  watchers: c.watchers.map((w) => ({ propName: w.propName, methodName: w.methodName })),
  elementRef: nul(c.elementRef),
  attachInternalsMemberName: nul(c.attachInternalsMemberName),
  attachInternalsCustomStates: (c.attachInternalsCustomStates ?? []).map((s) => ({ name: s.name, initialValue: s.initialValue, docs: s.docs })),
  formAssociated: !!c.formAssociated,
  serializers: (c.serializers ?? []).map((w) => ({ propName: w.propName, methodName: w.methodName })),
  deserializers: (c.deserializers ?? []).map((w) => ({ propName: w.propName, methodName: w.methodName })),
});

const fromStencilrs = (c) => ({
  ...c,
  properties: c.properties.map((p) => ({ ...p, attribute: nul(p.attribute), defaultValue: nul(p.defaultValue) })),
  listeners: c.listeners.map((l) => ({ ...l, target: nul(l.target) })),
  elementRef: nul(c.elementRef),
  attachInternalsMemberName: nul(c.attachInternalsMemberName),
});

const diagList = (list, text) => list.map((d) => `${d.level}: ${String(text(d)).trim()}`).sort();

/** Paths where `a` and `b` differ, as `path: expected → actual` lines. */
const diff = (a, b, path = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap((k) => diff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return [`${path || '(root)'}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
};

const safeNormalize = (code) => {
  try {
    return normalize(code);
  } catch (e) {
    return `<<unparsable: ${e.message}>>\n${code}`;
  }
};

/** The first differing lines of two normalized outputs, with a little context. */
const codeDiff = (expected, actual) => {
  if (expected === actual) return [];
  const a = expected.split('\n');
  const b = actual.split('\n');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const out = [`code: first difference at line ${i + 1}`];
  for (let k = Math.max(0, i - 1); k < Math.min(Math.max(a.length, b.length), i + 4); k++) {
    if (a[k] !== b[k]) {
      if (a[k] !== undefined) out.push(`  - ${a[k]}`);
      if (b[k] !== undefined) out.push(`  + ${b[k]}`);
    } else {
      out.push(`    ${a[k]}`);
    }
  }
  return out;
};

const results = [];
for (const { id, file } of listFixtures(suite)) {
  const base = join(snapshotsDir, id.replace(/\.tsx?$/, ''));
  const snap = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const code = readFileSync(file, 'utf8');
  const ours = transpile(code, stencilrsOptions(code, id));

  const meta = diff(snap.data.map(fromStencil), ours.components.map(fromStencilrs), 'components');
  const diags = diff(
    diagList(snap.diagnostics, (d) => d.messageText),
    diagList(ours.diagnostics, (d) => d.message),
    'diagnostics',
  );
  const compiles = !snap.diagnostics.some((d) => d.level === 'error');
  const codeLines = compiles ? codeDiff(safeNormalize(readFileSync(`${base}.js`, 'utf8')), safeNormalize(ours.code)) : [];
  results.push({ id, meta, diags, code: codeLines, compiles });
}

const failing = results.filter((r) => r.meta.length || r.diags.length || r.code.length);
for (const r of failing) {
  const lines = [...r.meta, ...r.diags, ...r.code];
  console.log(`✗ ${r.id}`);
  for (const line of verbose ? lines : lines.slice(0, 8)) console.log(`    ${line.replaceAll('\n', '⏎')}`);
  if (!verbose && lines.length > 8) console.log(`    … ${lines.length - 8} more (--verbose)`);
}

const n = results.length;
const metaOk = results.filter((r) => !r.meta.length).length;
const diagOk = results.filter((r) => !r.diags.length).length;
const compiling = results.filter((r) => r.compiles);
const codeOk = compiling.filter((r) => !r.code.length).length;
console.log(
  `\n${n - failing.length}/${n} fixtures identical · metadata ${metaOk}/${n} · diagnostics ${diagOk}/${n}` +
    ` · code ${codeOk}/${compiling.length} (fixtures that compile)`,
);
process.exitCode = failing.length ? 1 : 0;
