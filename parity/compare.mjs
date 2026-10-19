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
const references = (refs) => refs ?? {};
const complexType = (t) => ({ original: t?.original, resolved: t?.resolved, references: references(t?.references) });
const methodType = (t) => ({
  signature: t?.signature,
  parameters: (t?.parameters ?? []).map((p) => ({ name: p.name, type: p.type, docs: p.docs })),
  references: references(t?.references),
  return: t?.return,
});
const docs = (d) => ({ text: d?.text ?? '', tags: (d?.tags ?? []).map((t) => ({ name: t.name, text: t.text })) });

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
    complexType: complexType(p.complexType),
    docs: docs(p.docs),
  })),
  states: c.states.map((s) => ({ name: s.name })),
  events: c.events.map((e) => ({ name: e.name, method: e.method, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed, docs: docs(e.docs), complexType: complexType(e.complexType) })),
  methods: c.methods.map((m) => ({ name: m.name, docs: docs(m.docs), complexType: methodType(m.complexType) })),
  listeners: c.listeners.map((l) => ({ name: l.name, method: l.method, target: nul(l.target), capture: l.capture, passive: l.passive })),
  // A numeric @Watch() argument stays a TypeScript AST node: Stencil prints it as "[object Object]".
  watchers: c.watchers.map((w) => ({ propName: String(w.propName), methodName: w.methodName })),
  elementRef: nul(c.elementRef),
  attachInternalsMemberName: nul(c.attachInternalsMemberName),
  attachInternalsCustomStates: (c.attachInternalsCustomStates ?? []).map((s) => ({ name: s.name, initialValue: s.initialValue, docs: s.docs })),
  formAssociated: !!c.formAssociated,
  serializers: (c.serializers ?? []).map((w) => ({ propName: w.propName, methodName: w.methodName })),
  deserializers: (c.deserializers ?? []).map((w) => ({ propName: w.propName, methodName: w.methodName })),
  docs: docs(c.docs),
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

/**
 * A member whose `complexType` stencilrs reports as not ported is empty there (and the file is
 * flagged for Stencil's own compiler): leave it out of the comparison, keep the rest.
 */
const skipUncomputed = (expected, actual) => {
  const empty = { properties: (t) => t.resolved === '', events: (t) => t.resolved === '', methods: (t) => t.signature === '' };
  for (const [i, c] of actual.entries()) {
    for (const [kind, isEmpty] of Object.entries(empty)) {
      for (const [j, member] of c[kind].entries()) {
        const want = expected[i]?.[kind][j];
        if (isEmpty(member.complexType) && want?.name === member.name) {
          delete want.complexType;
          delete member.complexType;
        }
      }
    }
  }
};

const results = [];
for (const { id, file } of listFixtures(suite)) {
  const base = join(snapshotsDir, id.replace(/\.tsx?$/, ''));
  const snap = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  const code = readFileSync(file, 'utf8');
  const ours = transpile(code, stencilrsOptions(code, id));

  const unported = ours.diagnostics.filter((d) => d.message.startsWith('stencilrs:'));
  const expected = snap.data.map(fromStencil);
  const actual = ours.components.map(fromStencilrs);
  if (unported.length) skipUncomputed(expected, actual);
  const meta = diff(expected, actual, 'components');
  const diags = diff(
    diagList(snap.diagnostics, (d) => d.messageText),
    diagList(ours.diagnostics.filter((d) => !unported.includes(d)), (d) => d.message),
    'diagnostics',
  );
  const compiles = !snap.diagnostics.some((d) => d.level === 'error');
  const codeLines = compiles ? codeDiff(safeNormalize(readFileSync(`${base}.js`, 'utf8')), safeNormalize(ours.code)) : [];
  results.push({ id, meta, diags, code: codeLines, compiles, unported });
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
const fellBack = results.filter((r) => r.unported.length);
if (fellBack.length) {
  console.log(`\n${fellBack.length} fixtures have a type stencilrs leaves to Stencil's compiler (those members are not compared):`);
  for (const r of fellBack) for (const d of r.unported) console.log(`  ${r.id}: ${d.message.replace(/^stencilrs: /, '')}`);
}
console.log(
  `\n${n - failing.length}/${n} fixtures identical · metadata ${metaOk}/${n} · diagnostics ${diagOk}/${n}` +
    ` · code ${codeOk}/${compiling.length} (fixtures that compile)`,
);
process.exitCode = failing.length ? 1 : 0;
