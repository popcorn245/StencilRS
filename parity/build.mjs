// The type-checked half of the parity harness: a small project built by real Stencil v5, compared
// with stencilrs' build-accurate metadata (`resolveImports: true`).
//
//   node build.mjs --snapshot    rewrite snapshots-build/ and snapshots-build-stable/ from full Stencil builds
//   node build.mjs [--verbose]   compare stencilrs against snapshots-build/
//
// `transpileSync` (every other suite) sees one file with no lib.d.ts, so a type from another
// file, `Function`, `Record<K, V>` or `Promise<T>` is `any` there. This builds
// `fixtures/build/` as a project (the docs-json output target) and snapshots every member's
// runtime flags (attribute, reflect, mutable, optional, required) and `complexType` (`original`, `resolved`, `references`; for a method the signature, parameters
// and return type). stencilrs must print the same text, or report a `stencilrs:` error for the
// member (the cue to compile with Stencil); those members are counted apart and left out of the
// comparison, as in `compare.mjs`.
import { cpSync, existsSync, symlinkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { analyze } from '../index.js';
import { BUILD_SUITES, root } from './lib.mjs';

const verbose = process.argv.includes('--verbose');
// The project and snapshots of the suite being run (see `BUILD_SUITES`; `snapshots-build` for `build`).
let project;
let snapshotsDir;
let suiteName;
const useSuite = (name) => {
  suiteName = name;
  project = join(root, 'fixtures', name);
  snapshotsDir = join(root, `snapshots-${name}`);
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const components = () => walk(join(project, 'src', 'components')).filter((f) => f.endsWith('.tsx')).map((f) => relative(project, f).replaceAll('\\', '/')).sort();

/** The part of a member's type metadata the snapshot keeps. */
const refs = (references, base) =>
  Object.fromEntries(
    Object.entries(references ?? {}).map(([name, r]) => [name, { ...r, ...(r.path?.startsWith(`${base}/`) ? { path: r.path.slice(base.length + 1) } : {}) }]),
  );
const valueType = (t, base) => ({ original: t.original, resolved: t.resolved, references: refs(t.references, base) });
const methodType = (t, base) => ({ signature: t.signature, parameters: t.parameters, references: refs(t.references, base), return: t.return });

/** What decides a prop's member flags and attribute: its attribute, reflection and modifiers. */
const propFlags = (p) => ({ attribute: p.attr ?? null, reflect: !!p.reflectToAttr, mutable: !!p.mutable, optional: !!p.optional, required: !!p.required });

const fromDocs = (c, base) => ({
  properties: (c.props ?? []).map((p) => ({ name: p.name, flags: propFlags(p), complexType: valueType(p.complexType, base) })),
  events: (c.events ?? []).map((e) => ({ name: e.event, complexType: valueType(e.complexType, base) })),
  methods: (c.methods ?? []).map((m) => ({ name: m.name, complexType: methodType(m.complexType, base) })),
  slots: (c.slots ?? []).map((s) => ({ name: s.name, docs: s.docs })),
});

const fromStencilrs = (c) => ({
  properties: c.properties.map((p) => ({
    name: p.name,
    flags: propFlags({ attr: p.attribute, reflectToAttr: p.reflect, mutable: p.mutable, optional: p.optional, required: p.required }),
    complexType: valueType(p.complexType, ''),
  })),
  events: c.events.map((e) => ({ name: e.name, complexType: valueType(e.complexType, '') })),
  methods: c.methods.map((m) => ({ name: m.name, complexType: methodType(m.complexType, '') })),
  slots: (c.slots ?? []).map((s) => ({ name: s.name, docs: s.docs })),
});

const snapshot = async () => {
  const { createCompiler, loadConfig, version } = await import('@stencil/core/compiler');
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-parity-build-'));
  const cwd = process.cwd();
  try {
    cpSync(project, dir, { recursive: true });
    // The project's own `node_modules` (fixture packages) stays, and the installed ones are linked in beside it.
    if (existsSync(join(project, 'node_modules'))) {
      for (const name of readdirSync(join(root, 'node_modules'))) {
        if (!existsSync(join(dir, 'node_modules', name))) symlinkSync(join(root, 'node_modules', name), join(dir, 'node_modules', name), 'junction');
      }
    } else symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'junction');
    process.chdir(dir);
    const base = process.cwd().replaceAll('\\', '/');
    const loaded = await loadConfig({
      config: { rootDir: base, namespace: 'parity', outputTargets: [{ type: 'docs-json', file: 'docs.json' }], logLevel: 'error' },
      initTsConfig: false,
    });
    if (loaded.diagnostics.length) throw new Error(loaded.diagnostics.map((d) => d.messageText).join('\n'));
    const compiler = await createCompiler(loaded.config);
    const built = await compiler.build();
    await compiler.destroy();
    const errors = built.diagnostics.filter((d) => d.level === 'error');
    if (errors.length) throw new Error(errors.map((d) => d.messageText).join('\n'));
    const docs = JSON.parse(readFileSync(join(dir, 'docs.json'), 'utf8'));
    rmSync(snapshotsDir, { recursive: true, force: true });
    mkdirSync(snapshotsDir, { recursive: true });
    let n = 0;
    for (const c of docs.components) {
      const file = relative(base, c.filePath ?? '').replaceAll('\\', '/') || relative(base, join(dir, c.tag));
      const out = join(snapshotsDir, file.replace(/^src\/components\//, '').replace(/\.tsx$/, '.json'));
      mkdirSync(join(out, '..'), { recursive: true });
      writeFileSync(out, `${JSON.stringify({ tag: c.tag, ...fromDocs(c, base) }, null, 2)}\n`);
      n++;
    }
    console.log(`${suiteName}: ${n} components snapshotted with Stencil ${version}`);
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
};

const diff = (a, b, path = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const leaves = [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], path ? `${path}.${k}` : k));
    // `references` objects are written in the order Stencil meets the names: compare the order of their keys too.
    if (!leaves.length && !Array.isArray(a) && /(^|\.)references$/.test(path) && Object.keys(a).join('\0') !== Object.keys(b).join('\0')) {
      return [{ path: `${path} (key order)`, expected: Object.keys(a), actual: Object.keys(b) }];
    }
    return leaves;
  }
  return [{ path, expected: a, actual: b }];
};

const compare = () => {
  if (!existsSync(snapshotsDir)) throw new Error(`no snapshots-${suiteName}/: run \`node build.mjs --snapshot\``);
  const cwd = process.cwd();
  process.chdir(project);
  let members = 0;
  let matched = 0;
  const fallbacks = [];
  const failures = [];
  try {
    for (const file of components()) {
      const snap = join(snapshotsDir, file.replace(/^src\/components\//, '').replace(/\.tsx$/, '.json'));
      const expected = JSON.parse(readFileSync(snap, 'utf8'));
      const result = analyze(readFileSync(join(project, file), 'utf8'), file, { resolveImports: true, complexTypes: true });
      const ours = fromStencilrs(result.components[0]);
      const fell = new Set();
      for (const d of result.diagnostics) {
        const m = /^stencilrs: the type of (prop|event|method) `([^`]+)` \((.*)\) is not ported yet\.$/.exec(d.message);
        if (m) {
          fell.add(`${m[1]}:${m[2]}`);
          fallbacks.push(`${file} ${m[1]} ${m[2]}: ${m[3]}`);
        } else if (d.message.startsWith('stencilrs:')) failures.push(`${file}: ${d.message}`);
      }
      // Slots are not typed, so they have no fallback: they must match.
      members++;
      const slotDiff = diff(expected.slots ?? [], ours.slots);
      if (slotDiff.length) failures.push(`${file} slots:\n${slotDiff.map((x) => `    ${x.path}: expected ${JSON.stringify(x.expected)}, got ${JSON.stringify(x.actual)}`).join('\n')}`);
      else matched++;
      const kinds = { properties: 'prop', events: 'event', methods: 'method' };
      for (const [group, kind] of Object.entries(kinds)) {
        for (const want of expected[group]) {
          members++;
          if (fell.has(`${kind}:${want.name}`)) continue;
          const got = ours[group].find((m) => m.name === want.name);
          const d = [...diff(want.complexType, got?.complexType), ...(want.flags ? diff(want.flags, got?.flags, 'flags') : [])];
          if (!d.length) matched++;
          else failures.push(`${file} ${kind} ${want.name}:\n${d.map((x) => `    ${x.path}: expected ${JSON.stringify(x.expected)}, got ${JSON.stringify(x.actual)}`).join('\n')}`);
        }
      }
    }
  } finally {
    process.chdir(cwd);
  }
  console.log(`${suiteName}: ${matched}/${members} members match Stencil's full build, ${fallbacks.length} left to Stencil (stencilrs: errors), ${failures.length} mismatches`);
  if (fallbacks.length) for (const f of verbose ? fallbacks : fallbacks.slice(0, 20)) console.log(`  fallback ${f}`);
  for (const f of failures) console.log(`  MISMATCH ${f}`);
  if (failures.length) process.exitCode = 1;
};

for (const name of BUILD_SUITES) {
  useSuite(name);
  if (process.argv.includes('--snapshot')) await snapshot();
  else compare();
}
