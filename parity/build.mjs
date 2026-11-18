// The type-checked half of the parity harness: a small project built by real Stencil v5, compared
// with stencilrs' build-accurate metadata (`resolveImports: true`).
//
//   node build.mjs --snapshot    rewrite snapshots-build/ from a full Stencil build
//   node build.mjs [--verbose]   compare stencilrs against snapshots-build/
//
// `transpileSync` (every other suite) sees one file with no lib.d.ts, so a type from another
// file, `Function`, `Record<K, V>` or `Promise<T>` is `any` there. This builds
// `fixtures/build/` as a project (the docs-json output target) and snapshots every member's
// `complexType` (`original`, `resolved`, `references`; for a method the signature, parameters
// and return type). stencilrs must print the same text, or report a `stencilrs:` error for the
// member (the cue to compile with Stencil); those members are counted apart and left out of the
// comparison, as in `compare.mjs`.
import { cpSync, existsSync, symlinkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { analyze } from '../index.js';
import { BUILD_SUITE, root } from './lib.mjs';

const project = join(root, 'fixtures', BUILD_SUITE);
const snapshotsDir = join(root, 'snapshots-build');
const verbose = process.argv.includes('--verbose');

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

const fromDocs = (c, base) => ({
  properties: (c.props ?? []).map((p) => ({ name: p.name, complexType: valueType(p.complexType, base) })),
  events: (c.events ?? []).map((e) => ({ name: e.event, complexType: valueType(e.complexType, base) })),
  methods: (c.methods ?? []).map((m) => ({ name: m.name, complexType: methodType(m.complexType, base) })),
});

const fromStencilrs = (c) => ({
  properties: c.properties.map((p) => ({ name: p.name, complexType: valueType(p.complexType, '') })),
  events: c.events.map((e) => ({ name: e.name, complexType: valueType(e.complexType, '') })),
  methods: c.methods.map((m) => ({ name: m.name, complexType: methodType(m.complexType, '') })),
});

const snapshot = async () => {
  const { createCompiler, loadConfig, version } = await import('@stencil/core/compiler');
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-parity-build-'));
  const cwd = process.cwd();
  try {
    cpSync(project, dir, { recursive: true });
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'junction');
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
    console.log(`build: ${n} components snapshotted with Stencil ${version}`);
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
};

const diff = (a, b, path = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return [{ path, expected: a, actual: b }];
};

const compare = () => {
  if (!existsSync(snapshotsDir)) throw new Error('no snapshots-build/: run `node build.mjs --snapshot`');
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
      const kinds = { properties: 'prop', events: 'event', methods: 'method' };
      for (const [group, kind] of Object.entries(kinds)) {
        for (const want of expected[group]) {
          members++;
          if (fell.has(`${kind}:${want.name}`)) continue;
          const got = ours[group].find((m) => m.name === want.name);
          const d = diff(want.complexType, got?.complexType);
          if (!d.length) matched++;
          else failures.push(`${file} ${kind} ${want.name}:\n${d.map((x) => `    ${x.path}: expected ${JSON.stringify(x.expected)}, got ${JSON.stringify(x.actual)}`).join('\n')}`);
        }
      }
    }
  } finally {
    process.chdir(cwd);
  }
  console.log(`build: ${matched}/${members} members match Stencil's full build, ${fallbacks.length} left to Stencil (stencilrs: errors), ${failures.length} mismatches`);
  if (fallbacks.length) for (const f of verbose ? fallbacks : fallbacks.slice(0, 20)) console.log(`  fallback ${f}`);
  for (const f of failures) console.log(`  MISMATCH ${f}`);
  if (failures.length) process.exitCode = 1;
};

if (process.argv.includes('--snapshot')) await snapshot();
else compare();
