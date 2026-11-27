// `foldRuntimeFlags` (default on, production client builds with the default runtime): the `BUILD` flags of Stencil's runtime computed from the
// whole project, as `stencil build` does (`getBuildFeatures` + `getStandaloneBuildConditionals` + `updateBuildConditionals` of @stencil/core's
// compiler), and served as constants from `@stencil/core/app-data`, so that the bundler drops the runtime features no component uses.
// Without it each component module mutates `BUILD` at run time (`runtimeFlags` in vite.js) and the runtime keeps every feature.
//
// Safety rule: a flag is never dropped on a guess. Anything that makes the project's component set uncertain (a file neither stencilrs nor
// Stencil's compiler can read, a package of prebuilt components, a runtime that is not bundled) keeps every flag on, with one warning.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { transpileMany } from './index.js';
import { compilerMetaOf, hasComponentDecorator, normalizePath, stencilMeta } from './vite-docs.js';

/**
 * Whether `foldRuntimeFlags` is on when the option is not given. The ONE place to flip the default: `false` makes the option opt-in
 * (`foldRuntimeFlags: true` or `{ dirs }`), `true` makes it opt-out (`foldRuntimeFlags: false`).
 */
export const FOLD_RUNTIME_FLAGS_DEFAULT = true;

/** The option, normalised: `{ enabled, dirs }` (`dirs`: folders relative to the Vite root, default `src`). */
export function foldRuntimeFlagsOption(option) {
  if (option === undefined) option = FOLD_RUNTIME_FLAGS_DEFAULT;
  if (option && typeof option === 'object') {
    const { dirs, ...rest } = option;
    const unknown = Object.keys(rest);
    if (unknown.length) throw new Error(`[stencilrs] foldRuntimeFlags: unknown option ${unknown.map((k) => JSON.stringify(k)).join(', ')} (dirs)`);
    if (dirs !== undefined && !(Array.isArray(dirs) && dirs.every((d) => typeof d === 'string'))) throw new Error(`[stencilrs] foldRuntimeFlags.dirs must be an array of folders`);
    return { enabled: true, dirs: dirs?.length ? [...dirs] : ['src'] };
  }
  return { enabled: !!option, dirs: ['src'] };
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'www', 'loader', 'hydrate', 'coverage']);
const isSource = (f) => (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) && !f.endsWith('.d.ts');
const posix = (p) => p.replaceAll('\\', '/');

function collect(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) collect(abs, out);
    else if (e.isFile() && isSource(abs)) out.push(abs);
  }
  return out;
}

const stampOf = (file) => {
  const st = statSync(file, { bigint: true, throwIfNoEntry: false });
  return st?.isFile() ? `${st.mtimeNs}:${st.size}` : null;
};

// `result.deps` of a transpile: [path, stamp | null] of every file it read (imported modules, tsconfigs).
const depsFresh = (deps, stamps) =>
  deps.every(([path, was]) => {
    let now = stamps.get(path);
    if (now === undefined) {
      now = stampOf(path);
      stamps.set(path, now);
    }
    return now === was;
  });

const SIGNALS_RE = /from\s+['"]@stencil\/core\/signals['"]/;
const RELATIVE_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bimport\s+)['"](\.{1,2}\/[^'"]*)['"]/g;
const BARE_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bimport\s+)['"]([^./'"][^'"]*)['"]/g;
const SLOT_RE = /<slot[\s>/]/;
const SVG_RE = /<svg[\s>/]/;
// A diagnostic that says stencilrs cannot give this file's metadata. A member's `complexType` (docs and types) changes no flag.
const unported = (d) => !/^stencilrs: the type of /.test(d.message) && (d.message.startsWith('stencilrs:') || d.level === 'error');
const unique = (re, source) => [...new Set([...source.matchAll(re)].map((m) => m[1]))];

/** A relative import specifier as the source file it names, or null. */
function resolveLocal(spec, from) {
  const base = resolve(dirname(from), spec);
  const stem = base.replace(/\.(m?js|jsx)$/, '');
  for (const c of [base, ...['.tsx', '.ts', '.jsx'].map((e) => base + e), ...['.tsx', '.ts'].map((e) => stem + e), ...['.tsx', '.ts'].map((e) => join(base, 'index' + e))]) {
    if (isSource(c) && existsSync(c) && statSync(c).isFile()) return posix(c);
  }
  return null;
}

/** Whether a module, or a module it imports from its own package, imports `@stencil/core` (the runtime this build bundles). */
export function usesSharedRuntime(file, limit = 80) {
  const seen = new Set();
  const queue = [file];
  while (queue.length && seen.size < limit) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    let text;
    try {
      text = readFileSync(f, 'utf-8');
    } catch {
      continue;
    }
    if (/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\(\s*)['"]@stencil\/core(?:\/|['"])/.test(text)) return true;
    for (const spec of unique(RELATIVE_IMPORT_RE, text)) {
      const target = resolve(dirname(f), spec);
      if (existsSync(target) && statSync(target).isFile()) queue.push(target);
    }
  }
  return false;
}

/** The package name of a bare specifier (`@scope/name/sub` -> `@scope/name`), or null for what is not a package. */
const packageOf = (spec) => {
  if (/^(node:|\0|virtual:|\/|[a-z]+:)/i.test(spec)) return null;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

/** The real folder of a package that ships compiled Stencil components (it has a `collection`, or lists `@stencil/core` as a dependency), else null. */
function componentPackage(name, fromDir) {
  if (name.startsWith('@stencil/') || name === '@popcorn245/stencilrs') return null;
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const pkgFile = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
        const uses = !!(pkg.collection || pkg.dependencies?.['@stencil/core'] || pkg.peerDependencies?.['@stencil/core']);
        return uses ? posix(dirname(realpathSync(pkgFile))) : null;
      } catch {
        return null;
      }
    }
    if (dirname(dir) === dir) return null;
  }
}

/**
 * The scanner of a plugin instance. Its cache (per source file: the file's and its dependencies' `<mtime ns>:<size>` stamps) lives as
 * long as the instance, so a watch rebuild reads again only what changed.
 */
export function createFoldScanner({ resolveImports = true } = {}) {
  const cache = new Map(); // file -> entry
  const packages = new Map(); // `${dir}|${name}` -> real folder | null

  const transpileOptions = (file) => ({ file: normalizePath(file, false), resolveImports, componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null, jsx: 'classic' });

  /** The entry of a transpile result: `metas` (or `reason` when stencilrs cannot give them), `deps`. */
  function fromTranspile(entry, result) {
    if (result.error) return void (entry.reason = result.error);
    const bad = result.diagnostics.find(unported);
    if (bad) return void (entry.reason = bad.message);
    entry.deps = [...(result.deps ?? []), ...result.baseClasses.map((b) => [b, stampOf(b)])];
    if (!result.components?.length) return void (entry.metas = []); // a base class or mixin
    if (result.components.length > 1) return void (entry.reason = 'several components in one file');
    const meta = compilerMetaOf(result.code);
    if (!meta) return void (entry.reason = 'no COMPILER_META');
    entry.metas = [meta];
  }

  /**
   * `<slot>` and `<svg>` in the local modules a component imports (functional components, helpers; not other components). The metadata reads
   * the component's own file, but such a module renders into the component, so its features count: put on, never dropped on a guess. Every
   * module read goes into the entry's `deps`, so an edit of one rescans the component.
   */
  function addLocalFeatures(entry, file, local) {
    const names = new Set();
    const visited = new Set();
    const visit = (from, imports, depth) => {
      for (const spec of imports) {
        const target = resolveLocal(spec, from);
        if (!target || target.includes('/node_modules/')) continue;
        let m = local.get(target);
        if (!m) {
          const text = readFileSync(target, 'utf-8');
          m = { stamp: stampOf(target), slot: SLOT_RE.test(text), svg: SVG_RE.test(text), component: hasComponentDecorator(text), imports: unique(RELATIVE_IMPORT_RE, text) };
          local.set(target, m);
        }
        entry.deps.push([target, m.stamp]);
        if (m.component || visited.has(target)) continue; // another component counts for itself
        visited.add(target);
        if (m.slot) names.add('slot');
        if (m.svg) names.add('svg');
        if (depth < 4) visit(target, m.imports, depth + 1);
      }
    };
    visit(file, entry.imports, 0);
    for (const meta of entry.metas) meta.htmlTagNames = [...new Set([...(meta.htmlTagNames ?? []), ...names])];
  }

  /** The same metadata from Stencil's compiler, for a file stencilrs does not port; it reads this file only, so its own `<slot>` / `<svg>` text is added. */
  async function fromStencil(entry, file, source) {
    const metas = await stencilMeta(file, source);
    if (!metas.length) throw new Error("Stencil's compiler found no component in a file with a component decorator");
    for (const m of metas) m.htmlTagNames = [...new Set([...(m.htmlTagNames ?? []), ...(SLOT_RE.test(source) ? ['slot'] : []), ...(SVG_RE.test(source) ? ['svg'] : [])])];
    entry.metas = metas;
    entry.fallback = true;
  }

  /**
   * The components of the project: every source file under `dirs`, plus the local modules they and `entries` import (a component outside
   * `dirs` that the bundle reaches is part of the project), plus `extraSources` (`{ file, source }`, collections compiled as the project's own).
   * `resolveSpec(spec, importer)` is the bundler's resolver, for aliases and workspace packages. `prebuilt` lists the imports (`{ spec, name, from, id }`) of packages that ship compiled Stencil components (not in `skipPackages`, and none of their
   * folders is scanned): whether one shares the runtime is for `usesSharedRuntime` to say, once the bundler has resolved it.
   */
  async function scan(root, { dirs = null, entries = [], extraSources = [], skipPackages = [], resolveSpec = null } = {}) {
    const started = performance.now();
    const resolved = new Map(); // `${dir}|${specifier}` -> the file the bundler resolves it to, this scan
    const stamps = new Map();
    const seen = new Set();
    const entriesOf = new Map();
    const queue = [...(dirs?.length ? dirs : [root]).flatMap((d) => collect(d, [])), ...entries.filter((f) => isSource(f) && existsSync(f))].map(posix);
    const pending = []; // entries to transpile
    const local = new Map(); // local modules read for `addLocalFeatures`, this scan
    while (queue.length) {
      const file = queue.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      let entry = cache.get(file);
      const stamp = stampOf(file);
      if (!entry || entry.stamp !== stamp || !entry.done || !depsFresh(entry.deps, stamps)) {
        let source;
        try {
          source = readFileSync(file, 'utf-8');
        } catch {
          continue;
        }
        entry = { stamp, deps: [], imports: unique(RELATIVE_IMPORT_RE, source), bare: unique(BARE_IMPORT_RE, source), signals: SIGNALS_RE.test(source), decorated: hasComponentDecorator(source), source, metas: [], done: false };
        cache.set(file, entry);
        if (entry.decorated) pending.push([file, entry]);
        else entry.done = true;
      }
      entriesOf.set(file, entry);
      for (const spec of entry.imports) {
        const target = resolveLocal(spec, file);
        if (target && !target.includes('/node_modules/')) queue.push(target);
      }
      // A bare import is a package, or an alias (`@utils/x`, a workspace package) for a source file of the project: the bundler says which.
      for (const spec of resolveSpec ? entry.bare : []) {
        const name = packageOf(spec);
        if (!name || name.startsWith('@stencil/') || skipPackages.includes(name)) continue;
        const key = `${dirname(file)}|${spec}`;
        if (!resolved.has(key)) {
          const r = await resolveSpec(spec, file).catch(() => null);
          resolved.set(key, r && !r.external ? posix(r.id.split('?')[0]) : null);
        }
        const id = resolved.get(key);
        if (id && !id.startsWith('\0') && !id.includes('/node_modules/') && isSource(id)) queue.push(id);
      }
    }
    // Extra sources (collection components) have no file of their own to stat: keyed by their text.
    for (const { file, source } of extraSources) {
      const key = `extra:${file}`;
      let entry = cache.get(key);
      if (!entry || entry.text !== source || !entry.done) {
        entry = { text: source, stamp: null, deps: [], imports: [], bare: [], signals: SIGNALS_RE.test(source), decorated: hasComponentDecorator(source), source, metas: [], done: false, extra: file };
        cache.set(key, entry);
        if (entry.decorated) pending.push([file, entry]);
        else entry.done = true;
      }
      entriesOf.set(key, entry);
    }

    // All the files to compile at once, on every core.
    if (pending.length) {
      const results = await transpileMany(pending.map(([file, e]) => ({ source: e.source, options: transpileOptions(file) })));
      pending.forEach(([, entry], i) => fromTranspile(entry, results[i]));
    }
    // What stencilrs could not read comes from Stencil's compiler (loads TypeScript, once per build: only a project with such files pays).
    for (const [file, entry] of pending) {
      if (entry.reason) {
        try {
          await fromStencil(entry, file, entry.source);
        } catch (e) {
          entry.failed = `${entry.reason}; Stencil's compiler: ${e.message}`;
        }
      }
      if (!entry.failed && entry.metas.length) addLocalFeatures(entry, file, local);
      entry.done = true;
      delete entry.source;
    }

    const cmps = [];
    const fallback = [];
    const failed = [];
    let signalsImport = false;
    for (const [key, entry] of entriesOf) {
      const file = entry.extra ?? key;
      signalsImport ||= entry.signals;
      if (entry.failed) failed.push({ file, reason: entry.failed });
      else {
        cmps.push(...entry.metas);
        if (entry.fallback) fallback.push({ file, reason: entry.reason });
      }
    }

    // Packages of prebuilt components that the scanned sources import: their components share the runtime but are not in `cmps`.
    const skip = new Set(skipPackages);
    const scannedFiles = [...seen];
    const prebuilt = new Map();
    for (const [key, entry] of entriesOf) {
      for (const spec of entry.bare) {
        const name = packageOf(spec);
        if (!name || skip.has(name) || prebuilt.has(spec)) continue;
        const from = dirname(entry.extra ?? key);
        const id = `${from}|${name}`;
        if (!packages.has(id)) packages.set(id, componentPackage(name, from));
        const folder = packages.get(id);
        // A package whose sources are among the scanned files (a workspace package listed in `dirs`) is counted already.
        if (folder && !scannedFiles.some((f) => f.startsWith(folder + '/'))) prebuilt.set(spec, { spec, name, from: entry.extra ?? key, id: resolved.get(`${from}|${spec}`) });
      }
    }
    return { cmps, signalsImport, fallback, failed, prebuilt: [...prebuilt.values()], files: seen, watch: [...entriesOf.values()].flatMap((e) => e.deps.map(([p]) => p)).concat(scannedFiles), ms: performance.now() - started };
  }

  return { scan };
}

/** The component metadata of every component under `dirs` (default `root`), once, without a cache: for tools and tests. */
export async function scanComponents(root, { resolveImports = true, dirs = null } = {}) {
  const r = await createFoldScanner({ resolveImports }).scan(root, { dirs });
  return { ...r, complete: !r.failed.length, problems: r.failed.map((f) => `${f.file}: ${f.reason}`) };
}

/** The source files a Vite config names as entries: `build.rollupOptions.input`, `build.lib.entry`, and the module scripts of `<root>/index.html`. */
export function entryFilesOf(config) {
  const root = config.root;
  const out = new Set();
  const add = (v) => {
    if (typeof v === 'string') out.add(posix(resolve(root, v)));
    else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === 'object') Object.values(v).forEach(add);
  };
  add(config.build?.rollupOptions?.input);
  add(config.build?.lib?.entry);
  const html = join(root, 'index.html');
  if (existsSync(html)) {
    for (const m of readFileSync(html, 'utf-8').matchAll(/<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/g)) if (!/^[a-z]+:|^\/\//i.test(m[1])) out.add(posix(resolve(root, m[1].replace(/^\//, ''))));
  }
  return [...out].filter((f) => isSource(f) && existsSync(f) && statSync(f).isFile());
}

/** `getBuildFeatures` of Stencil's compiler. */
export function buildFeatures(cmps) {
  const some = (k) => cmps.some((c) => c[k]);
  const slot = cmps.some((c) => c.htmlTagNames.includes('slot'));
  const shadowDom = cmps.some((c) => c.encapsulation === 'shadow');
  const slotRelocation = cmps.some((c) => c.encapsulation !== 'shadow' && c.htmlTagNames.includes('slot'));
  const f = {
    allRenderFn: cmps.every((c) => c.hasRenderFn),
    formAssociated: some('formAssociated'),
    deserializer: some('hasDeserializer'),
    element: some('hasElement'),
    event: some('hasEvent'),
    hasRenderFn: some('hasRenderFn'),
    lifecycle: some('hasLifecycle'),
    asyncLoading: true,
    hostListener: some('hasListener'),
    hostListenerTargetWindow: some('hasListenerTargetWindow'),
    hostListenerTargetDocument: some('hasListenerTargetDocument'),
    hostListenerTargetBody: some('hasListenerTargetBody'),
    hostListenerTarget: some('hasListenerTarget'),
    member: some('hasMember'),
    method: some('hasMethod'),
    mode: some('hasMode'),
    observeAttribute: cmps.some((c) => c.hasAttribute || c.hasWatchCallback || c.hasDeserializer),
    prop: some('hasProp'),
    propBoolean: some('hasPropBoolean'),
    propChangeCallback: cmps.some((c) => c.hasWatchCallback || c.hasDeserializer || c.hasSerializer),
    propNumber: some('hasPropNumber'),
    propString: some('hasPropString'),
    propMutable: some('hasPropMutable'),
    reflect: cmps.some((c) => c.hasReflect || c.hasSerializer),
    scoped: cmps.some((c) => c.encapsulation === 'scoped'),
    serializer: some('hasSerializer'),
    shadowDom,
    shadowDelegatesFocus: shadowDom && some('shadowDelegatesFocus'),
    shadowModeClosed: shadowDom && cmps.some((c) => c.shadowMode === 'closed'),
    shadowSlotAssignmentManual: shadowDom && cmps.some((c) => c.slotAssignment === 'manual'),
    shadowClonable: shadowDom && some('shadowClonable'),
    shadowSerializable: shadowDom && some('shadowSerializable'),
    slot,
    slotRelocation,
    state: some('hasState'),
    style: some('hasStyle'),
    svg: cmps.some((c) => c.htmlTagNames.includes('svg')),
    updatable: some('isUpdateable'),
    vdomAttribute: some('hasVdomAttribute'),
    vdomXlink: some('hasVdomXlink'),
    vdomClass: some('hasVdomClass'),
    vdomFunctional: some('hasVdomFunctional'),
    vdomKey: some('hasVdomKey'),
    vdomListener: some('hasVdomListener'),
    vdomPropOrAttr: some('hasVdomPropOrAttr'),
    vdomPropOrAttrPrefix: some('hasVdomPropOrAttrPrefix'),
    vdomRef: some('hasVdomRef'),
    vdomRender: some('hasVdomRender'),
    vdomStyle: some('hasVdomStyle'),
    vdomText: some('hasVdomText'),
    vdomSignals: some('hasSignalsImport'),
    taskQueue: true,
    patchAll: some('hasPatchAll'),
    patchChildren: some('hasPatchChildren'),
    patchClone: some('hasPatchClone'),
    patchInsert: some('hasPatchInsert'),
  };
  f.vdomAttribute = f.vdomAttribute || f.reflect;
  f.vdomPropOrAttr = f.vdomPropOrAttr || f.reflect;
  return f;
}

/**
 * `getStandaloneBuildConditionals` + `updateBuildConditionals` for a production client build with default config (`compat.lightDomPatches`
 * true, no `signalBacking`, `invisiblePrehydration` and the hydrated class on). `hydrateClientSide`: Stencil sets it when the project has an
 * SSR output target; here when the `hydrateClient` option is on. `overrides` (the user's `buildFlags`) replace the computed component features
 * before the rules below run, so that what follows from a flag follows from the user's value (`slotRelocation: true` turns the light-DOM patches on).
 */
export function standaloneFlags(cmps, { hydrateClientSide = false, signals = false, overrides = {} } = {}) {
  const b = buildFeatures(cmps);
  for (const k of Object.keys(b)) if (k in overrides) b[k] = overrides[k];
  b.lazyLoad = false;
  b.hydrateClientSide = hydrateClientSide;
  b.hydrateServerSide = false;
  b.asyncQueue = false;
  b.initializeNextTick = false;
  b.vdomSignals = b.vdomSignals || signals;
  b.isDebug = false;
  b.isDev = false;
  b.isTesting = false;
  b.devTools = false;
  b.profile = false;
  b.hotModuleReplacement = false;
  b.updatable = b.updatable || b.hydrateClientSide;
  b.member = b.member || b.updatable || b.mode || b.lifecycle;
  b.constructableCSS = true;
  b.cssAnnotations = true;
  b.lightDomPatches = b.slotChildNodes = b.slotDomMutations = b.slotTextContent = b.slotRelocation;
  b.slotCloneNode = false;
  b.lifecycleDOMEvents = false;
  b.invisiblePrehydration = true;
  b.hydratedAttribute = false;
  b.hydratedClass = true;
  return b;
}

/** The `BUILD = {...}` literal of the runtime's own `app-data` module (every flag it knows, with its default). */
export function defaultBuildFlags(appDataFile) {
  const text = readFileSync(appDataFile, 'utf-8');
  const m = /const BUILD = (\{[\s\S]*?\n\});/.exec(text);
  if (!m) throw new Error(`[stencilrs] foldRuntimeFlags: no BUILD object in ${appDataFile}`);
  return new Function(`return ${m[1]}`)();
}

/** `@stencil/core/app-data` with the folded flags. `Env` and `NAMESPACE` are the runtime's own. */
export const foldedAppDataModule = (flags) => `export const BUILD = ${JSON.stringify(flags)};\nexport const Env = {};\nexport const NAMESPACE = "app";\n`;

/**
 * `BUILD.x` / `BUILD$1.x` reads in the runtime's source (not writes) as the literal of the flag. A flag the `BUILD` object does not have
 * (`signalBacking`: only `stencil build` writes it, when on) reads `undefined` there, and so here.
 */
export function foldBuildReads(code, flags) {
  return code.replace(/\bBUILD(?:\$1)?\.([A-Za-z]\w*)\b(?!\s*=[^=])/g, (all, k) => (k in flags ? JSON.stringify(flags[k]) : 'void 0'));
}

const APP_DATA = '@stencil/core/app-data';
const lines = (items) => items.slice(0, 5).map((i) => `\n  - ${i}`).join('') + (items.length > 5 ? `\n  - ... and ${items.length - 5} more` : '');
const rel = (root, f) => (f.startsWith(posix(root) + '/') ? f.slice(posix(root).length + 1) : f);

/**
 * The `BUILD` flags of a production client build as constants, or `flags: null` when every flag has to stay on (the caller then keeps what it
 * did without folding). `overrides` is what `runtimeFlags` of vite.js gives (`signals`, the user's `buildFlags`, `hydrateClient`): it wins over
 * the computed flags. Warns once, naming the files, whenever it keeps everything on because the component set is not certain.
 * @returns {Promise<{ flags: Record<string, unknown> | null, scan?: object, reason?: string }>}
 */
export async function foldFlagsForBuild(ctx, scanner, { root, dirs, signals, overrides, entries = [], extraSources = [], skipPackages = [], verbose = false }) {
  const note = (m) => ctx.warn(`[stencilrs] foldRuntimeFlags: ${m}\n  Every runtime feature stays on (as with foldRuntimeFlags: false). Add the folders of the components to foldRuntimeFlags.dirs, or set foldRuntimeFlags: false.`);
  const appData = await ctx.resolve(APP_DATA, join(root, 'noop.js'), { skipSelf: true });
  // A runtime that is not part of this bundle (an external `@stencil/core`) is the consumer's, with its own flags: the components must set them.
  if (!appData || appData.external) return { flags: null, reason: appData ? 'external runtime' : 'no @stencil/core/app-data' };
  const scan = await scanner.scan(root, { dirs, entries, extraSources, skipPackages, resolveSpec: (spec, importer) => ctx.resolve(spec, importer, { skipSelf: true }) });
  if (ctx.meta?.watchMode) for (const f of scan.watch) ctx.addWatchFile(f);
  if (scan.failed.length) {
    note(`${scan.failed.length} file(s) could not be read by stencilrs or by Stencil's compiler, so their features are unknown:${lines(scan.failed.map((f) => `${rel(root, f.file)}: ${f.reason}`))}`);
    return { flags: null, scan };
  }
  // A package of prebuilt components that shares this runtime (its modules import `@stencil/core`) has features nobody counted. One that bundles
  // a runtime of its own (ionicons' `ion-icon`, a standalone build) does not touch this one.
  const shared = [];
  for (const p of scan.prebuilt) {
    // `id` is where the bundler resolved it (null: not bundled, an external or unresolvable import, which is not part of this runtime).
    if (p.id === undefined || (p.id && usesSharedRuntime(p.id))) shared.push(p.name);
  }
  if (shared.length) {
    const names = [...new Set(shared)];
    note(`${names.length} package(s) of prebuilt Stencil components share the runtime (${names.join(', ')}); their features are unknown.`);
    return { flags: null, scan };
  }
  if (!scan.cmps.length) {
    if (verbose) ctx.info?.('[stencilrs] foldRuntimeFlags: no component found, every runtime feature stays on');
    return { flags: null, scan };
  }
  const base = defaultBuildFlags(appData.id.split('?')[0]);
  // `hydrateClientSide` stays what it is without folding (on, unless `buildFlags` or `hydrateClient` say otherwise): Stencil turns it off only for a
  // project with an SSR output target, which this cannot know. `buildFlags: { hydrateClientSide: false }` is the one that matters most.
  const flags = {
    ...base,
    ...standaloneFlags(scan.cmps, { hydrateClientSide: overrides.hydrateClientSide ?? base.hydrateClientSide, signals: signals || scan.signalsImport, overrides }),
    ...overrides,
  };
  if (verbose) {
    ctx.info?.(`[stencilrs] foldRuntimeFlags: ${scan.cmps.length} component(s) in ${Math.round(scan.ms)} ms, ${Object.values(flags).filter(Boolean).length}/${Object.keys(flags).length} flags on` + (scan.fallback.length ? `, ${scan.fallback.length} file(s) read by Stencil's compiler (${scan.fallback.slice(0, 3).map((f) => rel(root, f.file) + ': ' + f.reason).join('; ')})` : ''));
  }
  return { flags, scan };
}

/**
 * Modules that use the runtime but were not scanned (so their features are not in the flags): the safety net of `buildEnd`, for what the scan's
 * import walk cannot see (an alias, a workspace package resolved to its sources). `ignore(file)`: modules known to be fine.
 */
export function unscannedRuntimeUsers(ctx, scannedFiles, isRuntimeId, ignore) {
  return [...ctx.getModuleIds()].filter((id) => {
    const file = id.split('?')[0].replaceAll('\\', '/');
    if (file.startsWith('\0') || scannedFiles.has(file) || ignore(file) || /\/node_modules\/@stencil\//.test(file)) return false;
    return ctx.getModuleInfo(id)?.importedIds.some(isRuntimeId);
  });
}
