// The runtime `BUILD` flags of a hydrate app, derived from its components the way `stencil build` does.
//
// Stencil's `ssr` output target hands the runtime `getSsrBuildConditionals(config, components)`
// (output-targets/ssr/ssr-build-conditionals.ts): `getBuildFeatures` (app-core/app-data.ts) asks each feature of
// the components' metadata (does any component use `@Listen` on `window`, `@Prop() boolean`, a `ref`, a `key`, a
// `<slot>`, shadow DOM, a serializer, ...), `updateBuildConditionals` adds the config-driven ones, and the ssr
// target then forces its own. The runtime reads them as `BUILD.<flag>` in `renderVdom`, `setAccessor`,
// `proxyHostElement`, ... so a flag that is off skips its branch.
//
// stencilrs has the same metadata: `componentMetadata: 'compilerstatic'` writes `static get COMPILER_META()` with
// the `has*` facts `setComponentBuildConditionals` and `gatherVdomMeta` compute. That is read back here, so the
// facts are the compiler's own, not a second analysis.
//
// Where this is conservative (a flag may be on that Stencil has off, never the reverse):
//  - Stencil ORs the vdom facts and the tag and attribute names of every module a component imports, transitively
//    (`updateComponentBuildConditionals`). stencilrs reads facts per class, so a module a component imports that
//    renders JSX (a functional component, a helper calling `h`) turns every vdom flag, `slot` and `svg` on for that
//    component, whatever the module really uses.
//  - A component that does not transpile cleanly still counts: its metadata is read from the output as it is.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { transpileAsync } from './index.js';

/**
 * `getSsrBuildConditionals`' forced part: what the ssr target sets whatever the project uses. Also the whole
 * override of `features: 'all'`, over the runtime's defaults (every feature on).
 */
export const SSR_BUILD = {
  slotRelocation: true, lazyLoad: true, hydrateServerSide: true, hydrateClientSide: true, isDebug: false, isDev: false,
  isTesting: false, devTools: false, lifecycleDOMEvents: false, profile: false, hotModuleReplacement: false, updatable: true,
  member: true, constructableCSS: false, asyncLoading: true, lightDomPatches: false, slotChildNodes: false, slotCloneNode: false,
  slotDomMutations: false, slotTextContent: false, cssAnnotations: true,
};

const some = (metas, pick) => metas.some(pick);

/** `getBuildFeatures` over component metadata (the `COMPILER_META` objects), then `updateBuildConditionals`' part that depends on them. */
export const getBuildFeatures = (cmps) => {
  const slot = some(cmps, (c) => c.htmlTagNames.includes('slot'));
  const shadowDom = some(cmps, (c) => c.encapsulation === 'shadow');
  const slotRelocation = some(cmps, (c) => c.encapsulation !== 'shadow' && c.htmlTagNames.includes('slot'));
  const f = {
    allRenderFn: cmps.every((c) => c.hasRenderFn),
    formAssociated: some(cmps, (c) => c.formAssociated),
    deserializer: some(cmps, (c) => c.hasDeserializer),
    element: some(cmps, (c) => c.hasElement),
    event: some(cmps, (c) => c.hasEvent),
    hasRenderFn: some(cmps, (c) => c.hasRenderFn),
    lifecycle: some(cmps, (c) => c.hasLifecycle),
    asyncLoading: true,
    hostListener: some(cmps, (c) => c.hasListener),
    hostListenerTargetWindow: some(cmps, (c) => c.hasListenerTargetWindow),
    hostListenerTargetDocument: some(cmps, (c) => c.hasListenerTargetDocument),
    hostListenerTargetBody: some(cmps, (c) => c.hasListenerTargetBody),
    hostListenerTarget: some(cmps, (c) => c.hasListenerTarget),
    member: some(cmps, (c) => c.hasMember),
    method: some(cmps, (c) => c.hasMethod),
    mode: some(cmps, (c) => c.hasMode),
    observeAttribute: some(cmps, (c) => c.hasAttribute || c.hasWatchCallback || c.hasDeserializer),
    prop: some(cmps, (c) => c.hasProp),
    propBoolean: some(cmps, (c) => c.hasPropBoolean),
    propChangeCallback: some(cmps, (c) => c.hasWatchCallback || c.hasDeserializer || c.hasSerializer),
    propNumber: some(cmps, (c) => c.hasPropNumber),
    propString: some(cmps, (c) => c.hasPropString),
    propMutable: some(cmps, (c) => c.hasPropMutable),
    reflect: some(cmps, (c) => c.hasReflect || c.hasSerializer),
    scoped: some(cmps, (c) => c.encapsulation === 'scoped'),
    serializer: some(cmps, (c) => c.hasSerializer),
    shadowDom,
    shadowDelegatesFocus: shadowDom && some(cmps, (c) => c.shadowDelegatesFocus),
    shadowModeClosed: shadowDom && some(cmps, (c) => c.shadowMode === 'closed'),
    shadowSlotAssignmentManual: shadowDom && some(cmps, (c) => c.slotAssignment === 'manual'),
    shadowClonable: shadowDom && some(cmps, (c) => c.shadowClonable),
    shadowSerializable: shadowDom && some(cmps, (c) => c.shadowSerializable),
    slot,
    slotRelocation,
    state: some(cmps, (c) => c.hasState),
    style: some(cmps, (c) => c.hasStyle),
    svg: some(cmps, (c) => c.htmlTagNames.includes('svg')),
    updatable: some(cmps, (c) => c.isUpdateable),
    vdomAttribute: some(cmps, (c) => c.hasVdomAttribute),
    vdomXlink: some(cmps, (c) => c.hasVdomXlink),
    vdomClass: some(cmps, (c) => c.hasVdomClass),
    vdomFunctional: some(cmps, (c) => c.hasVdomFunctional),
    vdomKey: some(cmps, (c) => c.hasVdomKey),
    vdomListener: some(cmps, (c) => c.hasVdomListener),
    vdomPropOrAttr: some(cmps, (c) => c.hasVdomPropOrAttr),
    vdomPropOrAttrPrefix: some(cmps, (c) => c.hasVdomPropOrAttrPrefix),
    vdomRef: some(cmps, (c) => c.hasVdomRef),
    vdomRender: some(cmps, (c) => c.hasVdomRender),
    vdomStyle: some(cmps, (c) => c.hasVdomStyle),
    vdomText: some(cmps, (c) => c.hasVdomText),
    vdomSignals: some(cmps, (c) => c.hasSignalsImport),
    taskQueue: true,
    patchAll: some(cmps, (c) => c.hasPatchAll),
    patchChildren: some(cmps, (c) => c.hasPatchChildren),
    patchClone: some(cmps, (c) => c.hasPatchClone),
    patchInsert: some(cmps, (c) => c.hasPatchInsert),
  };
  f.vdomAttribute = f.vdomAttribute || f.reflect;
  f.vdomPropOrAttr = f.vdomPropOrAttr || f.reflect;
  return f;
};

/**
 * `getSsrBuildConditionals`: the features of `cmps`, `updateBuildConditionals` with the config an ssr build always
 * has (default `compat`, no `signalBacking`, the default hydrated flag), then the forced `SSR_BUILD`.
 */
export const ssrBuildConditionals = (cmps) => {
  const b = getBuildFeatures(cmps);
  // `updateBuildConditionals`, for a production, non-HMR config: these are what survives `SSR_BUILD`'s overrides.
  b.member = b.member || b.updatable || b.mode || b.lifecycle;
  b.signalBacking = false;
  b.invisiblePrehydration = true;
  b.hydratedAttribute = false;
  b.hydratedClass = true;
  b.hydratedSelectorName = 'hydrated';
  return { ...b, ...SSR_BUILD };
};

// ---- reading the metadata ----

const SPEC_PAGE = { componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null, resolveImports: false };
const IMPORTS_H_RE = /import\s+\{[^}]*\bh\b[^}]*\}\s+from\s+['"]@stencil\/core['"]/;
const META_RE = /COMPILER_META\(\)\s*\{\s*return\s*(\{[\s\S]*?\n\t\t\});/;
// A module that renders JSX: a call of `h` (classic) or of the automatic runtime's `jsx` / `jsxs` / `Fragment`.
const RENDERS_RE = /\b(h|jsx|jsxs|jsxDEV|Fragment)\s*\(|\bFragment\b/;
const IMPORT_RE = /(?:^|[\n;])\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js'];

const jsxFor = (code) => (IMPORTS_H_RE.test(code) ? { jsx: 'classic' } : { jsx: 'automatic', jsxImportSource: '@stencil/core' });

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

/** The local module `spec` names from `from`: relative, or through the Vite-style `alias`; null for a package or a miss. */
const resolveLocal = (spec, from, alias) => {
  let target = null;
  if (/^\.{1,2}\//.test(spec)) target = resolve(dirname(from), spec);
  else {
    const entries = Array.isArray(alias) ? alias : Object.entries(alias).map(([find, replacement]) => ({ find, replacement }));
    for (const { find, replacement } of entries) {
      const hit = typeof find === 'string' ? (spec === find || spec.startsWith(`${find}/`) ? spec.replace(find, replacement) : null) : find.test(spec) ? spec.replace(find, replacement) : null;
      if (hit != null) {
        target = resolve(hit);
        break;
      }
    }
  }
  if (target == null) return null;
  for (const ext of EXTENSIONS) if (isFile(target + ext)) return target + ext;
  return null;
};

/**
 * The `COMPILER_META` of each component, with what Stencil merges in from the modules it imports (see the header).
 *
 * @param {{ file: string, code: string, base?: string }[]} sources the component modules (the source, as the compiler reads it; `base` is where its relative imports start from when that is not `file`, as for a collection component)
 * @param {Record<string, string> | Array<{ find: string | RegExp, replacement: string }>} alias Vite `resolve.alias`
 * @returns {Promise<object[]>} one metadata object per component class
 */
export const readComponentMetadata = async (sources, alias = {}) => {
  const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);
  const componentFiles = new Set(sources.map((s) => s.file));
  const rendersCache = new Map();
  /** Whether `file` (not a component) renders JSX, or imports something that does. */
  const reaches = async (file, seen) => {
    if (seen.has(file)) return false;
    seen.add(file);
    const code = read(file);
    if (code == null || !/\.[jt]sx?$/.test(file)) return false;
    if (!rendersCache.has(file)) {
      const out = await transpileAsync(code, { file, componentExport: null, resolveImports: false, ...jsxFor(code) }).catch(() => null);
      // A file that does not transpile is unknown: assume it renders.
      rendersCache.set(file, out == null || RENDERS_RE.test(out.code));
    }
    if (rendersCache.get(file)) return true;
    for (const m of code.matchAll(IMPORT_RE)) {
      const dep = resolveLocal(m[1], file, alias);
      if (dep && !componentFiles.has(dep) && (await reaches(dep, seen))) return true;
    }
    return false;
  };
  const out = [];
  for (const { file, code, base = file } of sources) {
    const result = await transpileAsync(code, { file, ...SPEC_PAGE, ...jsxFor(code) });
    const metas = [...result.code.matchAll(new RegExp(META_RE.source, 'g'))].map((m) => new Function(`return ${m[1]}`)());
    if (!metas.length) throw new Error(`stencilrs/ssr: no component metadata in ${file}`);
    let renders = false;
    const seen = new Set([file]);
    for (const m of code.matchAll(IMPORT_RE)) {
      const dep = resolveLocal(m[1], base, alias);
      if (dep && !componentFiles.has(dep) && (await reaches(dep, seen))) {
        renders = true;
        break;
      }
    }
    for (const meta of metas) {
      if (renders) {
        for (const k of Object.keys(meta)) if (/^hasVdom/.test(k)) meta[k] = true;
        meta.htmlTagNames = [...new Set([...meta.htmlTagNames, 'slot', 'svg'])];
      }
      out.push(meta);
    }
  }
  return out;
};
