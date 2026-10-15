// Check stencilrs against the full `stencil build` (type-checked, whole program).
//
//   npm run build && node check-build.mjs [--verbose]
//
// The build's collection output (dist/collection/**) carries every component's metadata as
// static getters, computed with the real TypeScript checker. stencilrs (like Stencil's own
// single-file transpileSync / @stencil/unplugin) only sees one file at a time. This compares
// the two, field by field, per component, and groups the differences.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { analyze } from '@popcorn245/stencilrs';

const verbose = process.argv.includes('--verbose');
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** The value returned by `static get <name>() { return …; }`, evaluated as a JS literal. */
function staticGetter(code, name) {
  const m = new RegExp(`static get ${name}\\(\\)\\s*\\{\\s*return\\s`).exec(code);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0;
  let quote = null;
  for (; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ';' && depth === 0) break;
  }
  return new Function(`return (${code.slice(start, i)});`)();
}

const nul = (v) => (v === undefined ? null : v);

/** Full-build metadata, normalised the way `parseStatic*` does, projected like parity/compare.mjs. */
function fromBuild(code) {
  const props = staticGetter(code, 'properties') ?? {};
  return {
    tagName: staticGetter(code, 'is'),
    encapsulation: staticGetter(code, 'encapsulation') ?? 'none',
    properties: Object.entries(props).map(([name, p]) => ({
      name,
      type: p.type,
      mutable: !!p.mutable,
      required: !!p.required,
      optional: !!p.optional,
      getter: !!p.getter,
      setter: !!p.setter,
      reflect: typeof p.reflect === 'boolean' ? p.reflect : false,
      attribute: p.attribute ? p.attribute.toLowerCase() : null,
      defaultValue: nul(p.defaultValue),
      complexTypeOriginal: p.complexType?.original,
    })),
    states: Object.keys(staticGetter(code, 'states') ?? {}).map((name) => ({ name })),
    events: (staticGetter(code, 'events') ?? []).map((e) => ({ name: e.name, method: e.method, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed })),
    methods: Object.keys(staticGetter(code, 'methods') ?? {}).map((name) => ({ name })),
    listeners: (staticGetter(code, 'listeners') ?? []).map((l) => ({ name: l.name, method: l.method, target: nul(l.target), capture: !!l.capture, passive: !!l.passive })),
    watchers: (staticGetter(code, 'watchers') ?? []).map((w) => ({ propName: w.propName, methodName: w.methodName })),
    elementRef: nul(staticGetter(code, 'elementRef')),
  };
}

function fromStencilrs(c) {
  return {
    tagName: c.tagName,
    encapsulation: c.encapsulation,
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
      complexTypeOriginal: p.complexTypeOriginal,
    })),
    states: c.states,
    events: c.events,
    methods: c.methods,
    listeners: c.listeners.map((l) => ({ ...l, target: nul(l.target) })),
    watchers: c.watchers,
    elementRef: nul(c.elementRef),
  };
}

const diff = (a, b, path = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return [{ path, build: a, stencilrs: b }];
};

const collection = 'dist/collection';
let components = 0;
let identical = 0;
const byField = new Map();
for (const file of walk(collection).filter((f) => f.endsWith('.js'))) {
  const built = readFileSync(file, 'utf8');
  if (!/static get is\(\)/.test(built)) continue;
  components++;
  const srcFile = join('src', relative(collection, file)).replace(/\.js$/, '.tsx').replace(/\\/g, '/');
  const ours = analyze(readFileSync(srcFile, 'utf8'), srcFile, { resolveImports: true }).components;
  const diffs = diff(fromBuild(built), ours[0] ? fromStencilrs(ours[0]) : null);
  if (!diffs.length) {
    identical++;
    continue;
  }
  const props = fromBuild(built).properties;
  for (const d of diffs) {
    // Group by field: properties.N.type → properties[].type
    const field = d.path.replace(/\.\d+\./g, '[].').replace(/\.\d+$/, '[]');
    const name = /^properties\.(\d+)\./.test(d.path) ? props[Number(d.path.split('.')[1])]?.name : '';
    const list = byField.get(field) ?? [];
    list.push(`${srcFile.replace(/^src\//, '')}${name ? ` ${name}` : ''}: build ${JSON.stringify(d.build)} · stencilrs ${JSON.stringify(d.stencilrs)}`);
    byField.set(field, list);
  }
}

console.log(`${identical}/${components} components identical to the full stencil build's metadata\n`);
for (const [field, list] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(list.length).padStart(4)} × ${field}`);
  for (const line of verbose ? list : list.slice(0, 6)) console.log(`        ${line}`);
  if (!verbose && list.length > 6) console.log(`        … ${list.length - 6} more (--verbose)`);
}
