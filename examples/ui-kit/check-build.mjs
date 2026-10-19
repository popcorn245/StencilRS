// Check stencilrs against the full `stencil build` (type-checked, whole program).
//
//   npm run build && node check-build.mjs [--verbose]
//
// The build's collection output (dist/collection/**) carries every component's metadata as
// static getters, computed with the real TypeScript checker. stencilrs (like Stencil's own
// single-file transpileSync / @stencil/unplugin) only sees one file at a time. This compares
// the two, field by field, per component, and groups the differences: the member metadata,
// the JSDoc (`docs`) and the `complexType` (original, resolved, references) are counted apart.
//
// Each section counts components as matched (identical), fallback (stencilrs leaves something
// to Stencil's compiler: an error starting with `stencilrs:`; those members are not compared) or
// mismatch (a difference stencilrs should not have). Only a mismatch fails the check.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { analyze } from '@popcorn245/stencilrs';
import ts from 'typescript';

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

const docs = (d) => ({ text: d?.text ?? '', tags: (d?.tags ?? []).map((t) => ({ name: t.name, text: t.text })) });

/**
 * The component's JSDoc, from TypeScript itself: the collection's static getters carry the
 * members' docs but not the class's, and docs-json lets a `readme.md` overview replace it.
 */
function classDocs(srcFile) {
  const sf = ts.createSourceFile(srcFile, readFileSync(srcFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const cls = sf.statements.find((s) => ts.isClassDeclaration(s) && ts.getDecorators(s)?.length);
  return docs({
    text: (cls?.jsDoc ?? []).map((d) => ts.getTextOfJSDocComment(d.comment)).filter(Boolean).join('\n'),
    tags: cls ? ts.getJSDocTags(cls).map((t) => ({ name: t.tagName.text, text: ts.getTextOfJSDocComment(t.comment) })) : [],
  });
}

/** The build writes absolute paths for local types; stencilrs gets the path it was given. */
const cwd = process.cwd().replace(/\\/g, '/');
const relativePath = (p) => (p?.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p);
const references = (refs) => Object.fromEntries(Object.entries(refs ?? {}).map(([k, r]) => [k, { ...r, path: relativePath(r.path) }]));
const complexType = (t) => ({ original: t.original, resolved: t.resolved, references: references(t.references) });
const methodType = (t) => ({
  signature: t.signature,
  parameters: t.parameters,
  references: references(t.references),
  return: t.return,
});

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

/** Full-build JSDoc and complexType of every member. */
function typesFromBuild(code, srcFile) {
  const props = staticGetter(code, 'properties') ?? {};
  const events = staticGetter(code, 'events') ?? [];
  const methods = staticGetter(code, 'methods') ?? {};
  return {
    docs: {
      component: classDocs(srcFile),
      properties: Object.entries(props).map(([name, p]) => ({ name, docs: docs(p.docs) })),
      events: events.map((e) => ({ name: e.name, docs: docs(e.docs) })),
      methods: Object.entries(methods).map(([name, m]) => ({ name, docs: docs(m.docs) })),
    },
    complexType: {
      properties: Object.entries(props).map(([name, p]) => ({ name, complexType: complexType(p.complexType) })),
      events: events.map((e) => ({ name: e.name, complexType: complexType(e.complexType) })),
      methods: Object.entries(methods).map(([name, m]) => ({ name, complexType: methodType(m.complexType) })),
    },
  };
}

function typesFromStencilrs(c) {
  return {
    docs: {
      component: docs(c.docs),
      properties: c.properties.map((p) => ({ name: p.name, docs: docs(p.docs) })),
      events: c.events.map((e) => ({ name: e.name, docs: docs(e.docs) })),
      methods: c.methods.map((m) => ({ name: m.name, docs: docs(m.docs) })),
    },
    complexType: {
      properties: c.properties.map((p) => ({ name: p.name, complexType: complexType(p.complexType) })),
      events: c.events.map((e) => ({ name: e.name, complexType: complexType(e.complexType) })),
      methods: c.methods.map((m) => ({ name: m.name, complexType: methodType(m.complexType) })),
    },
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
    events: c.events.map(({ docs, complexType, ...rest }) => rest),
    methods: c.methods.map(({ docs, complexType, ...rest }) => rest),
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

/** The name of the member a diff path points into (`properties.3.complexType.resolved` → its prop). */
function memberName(root, path) {
  let node = root;
  let name = '';
  for (const key of path.split('.')) {
    node = node?.[key];
    if (typeof node?.name === 'string') name = node.name;
  }
  return name;
}

/** The members `stencilrs:` diagnostics say stencilrs leaves to Stencil, as `prop:name` keys. */
function fellBack(diagnostics) {
  const keys = new Set();
  for (const d of diagnostics) {
    const m = /^stencilrs: the type of (prop|event|method) `([^`]+)`/.exec(d.message);
    if (m) keys.add(`${m[1]}:${m[2]}`);
  }
  return keys;
}

/** The complexType section without the members that fell back (they are counted, not compared). */
function withoutFallbacks(types, keys) {
  const kind = { properties: 'prop', events: 'event', methods: 'method' };
  let skipped = 0;
  const out = {};
  for (const [group, members] of Object.entries(types)) {
    out[group] = members.filter((m) => {
      const fell = keys.has(`${kind[group]}:${m.name}`);
      if (fell) skipped++;
      return !fell;
    });
  }
  return { types: out, skipped };
}

const collection = 'dist/collection';
let components = 0;
const sections = ['metadata', 'docs', 'complexType'].map((title) => ({ title, matched: 0, fallback: 0, mismatch: 0, membersFallback: 0, byField: new Map() }));
for (const file of walk(collection).filter((f) => f.endsWith('.js'))) {
  const built = readFileSync(file, 'utf8');
  if (!/static get is\(\)/.test(built)) continue;
  components++;
  const srcFile = join('src', relative(collection, file)).replace(/\.js$/, '.tsx').replace(/\\/g, '/');
  const result = analyze(readFileSync(srcFile, 'utf8'), srcFile, { resolveImports: true, complexTypes: true });
  const ours = result.components[0];
  const unported = result.diagnostics.filter((d) => d.message.startsWith('stencilrs:'));
  const keys = fellBack(unported);
  const builtTypes = typesFromBuild(built, srcFile);
  const ourTypes = ours ? typesFromStencilrs(ours) : {};
  const expectedTypes = withoutFallbacks(builtTypes.complexType, keys);
  const actualTypes = ours ? withoutFallbacks(ourTypes.complexType, keys) : { types: undefined, skipped: 0 };
  const pairs = [
    [fromBuild(built), ours ? fromStencilrs(ours) : null],
    [builtTypes.docs, ourTypes.docs],
    [expectedTypes.types, actualTypes.types],
  ];
  pairs.forEach(([expected, actual], i) => {
    const section = sections[i];
    const diffs = diff(expected, actual);
    section.membersFallback += i === 2 ? expectedTypes.skipped : 0;
    // A member the diagnostics name is left to Stencil; so is a component the metadata and docs
    // cannot be read from (an unported member that is not a type).
    const other = unported.some((d) => !/^stencilrs: the type of (prop|event|method) /.test(d.message));
    if (!diffs.length) {
      if (i === 2 && expectedTypes.skipped) section.fallback++;
      else section.matched++;
    } else if (other) section.fallback++;
    else section.mismatch++;
    for (const d of diffs) {
      // Group by field: properties.N.type → properties[].type
      const field = d.path.replace(/\.\d+\./g, '[].').replace(/\.\d+$/, '[]');
      const name = memberName(expected, d.path);
      const list = section.byField.get(field) ?? [];
      list.push(`${srcFile.replace(/^src\//, '')}${name ? ` ${name}` : ''}: build ${JSON.stringify(d.build)} · stencilrs ${JSON.stringify(d.stencilrs)}`);
      section.byField.set(field, list);
    }
  });
}

for (const { title, matched, fallback, mismatch, membersFallback, byField } of sections) {
  console.log(`${title}: ${matched} matched · ${fallback} fallback · ${mismatch} mismatch (of ${components} components)` + (membersFallback ? ` · ${membersFallback} members left to Stencil` : '') + '\n');
  for (const [field, list] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${String(list.length).padStart(4)} × ${field}`);
    for (const line of verbose ? list : list.slice(0, 6)) console.log(`        ${line}`);
    if (!verbose && list.length > 6) console.log(`        … ${list.length - 6} more (--verbose)`);
  }
  console.log();
}
// A fallback is not a failure: the Vite plugin hands those components to Stencil. A mismatch is.
process.exitCode = sections.every((s) => s.mismatch === 0) ? 0 : 1;
