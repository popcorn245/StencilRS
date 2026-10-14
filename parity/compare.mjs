// Compare stencilrs against the Stencil v5 snapshots.
//
//   node compare.mjs [suite] [--verbose]
//
// Metadata: Stencil's `data` is projected to the fields stencilrs produces today (FIELDS
// below grows as the port does) and compared exactly. Diagnostics: compared as sorted
// lists of `level: message`. Code: not compared until stencilrs emits code.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyze } from '../index.js';
import { listFixtures, snapshotsDir } from './lib.mjs';

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
});

const fromStencilrs = (c) => ({
  ...c,
  properties: c.properties.map((p) => ({ ...p, attribute: nul(p.attribute), defaultValue: nul(p.defaultValue) })),
  listeners: c.listeners.map((l) => ({ ...l, target: nul(l.target) })),
  elementRef: nul(c.elementRef),
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

const results = [];
for (const { id, file } of listFixtures(suite)) {
  const snap = JSON.parse(readFileSync(join(snapshotsDir, id.replace(/\.tsx?$/, '.json')), 'utf8'));
  const code = readFileSync(file, 'utf8');
  const ours = analyze(code, id);

  const meta = diff(snap.data.map(fromStencil), ours.components.map(fromStencilrs), 'components');
  const diags = diff(
    diagList(snap.diagnostics, (d) => d.messageText),
    diagList(ours.diagnostics, (d) => d.message),
    'diagnostics',
  );
  results.push({ id, meta, diags });
}

const failing = results.filter((r) => r.meta.length || r.diags.length);
for (const r of failing) {
  const lines = [...r.meta, ...r.diags];
  console.log(`✗ ${r.id}`);
  for (const line of verbose ? lines : lines.slice(0, 6)) console.log(`    ${line.replaceAll('\n', '⏎')}`);
  if (!verbose && lines.length > 6) console.log(`    … ${lines.length - 6} more (--verbose)`);
}

const metaOk = results.filter((r) => !r.meta.length).length;
const diagOk = results.filter((r) => !r.diags.length).length;
console.log(
  `\n${results.length - failing.length}/${results.length} fixtures identical` +
    ` · metadata ${metaOk}/${results.length} · diagnostics ${diagOk}/${results.length} · code: not compared yet (no codegen)`,
);
process.exitCode = failing.length ? 1 : 0;
