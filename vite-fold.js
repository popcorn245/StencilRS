// `foldRuntimeFlags` (opt-in, production client builds only): the `BUILD` flags of Stencil's runtime computed from the whole project, as
// `stencil build` does (`getBuildFeatures` + `getStandaloneBuildConditionals` + `updateBuildConditionals` of @stencil/core's compiler), and
// served as constants from `@stencil/core/app-data`, so that the bundler drops the runtime features no component uses.
// Without it each component module mutates `BUILD` at run time (`runtimeFlags` in vite.js) and the runtime keeps every feature.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { transpile } from './index.js';
import { compilerMetaOf, hasComponentDecorator, normalizePath } from './vite-docs.js';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'www', 'loader', 'hydrate', 'coverage']);
const isSource = (f) => (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')) && !f.endsWith('.d.ts');

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

/**
 * The compiler metadata of every component under `dirs` (default: `root`), by stencilrs. `complete` is false when a file has something stencilrs does not
 * port yet (its flags are unknown): the caller then keeps every flag on, as without folding.
 */
export function scanComponents(root, { resolveImports = true, dirs = null } = {}) {
  const cmps = [];
  let complete = true;
  let signalsImport = false;
  const problems = [];
  const files = (dirs?.length ? dirs : [root]).flatMap((d) => collect(d, []));
  for (const file of files) {
    let source;
    try {
      source = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    if (/from\s+['"]@stencil\/core\/signals['"]/.test(source)) signalsImport = true;
    if (!hasComponentDecorator(source)) continue;
    const abs = normalizePath(file, false);
    let result;
    try {
      result = transpile(source, { file: abs, resolveImports, componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null, jsx: 'classic' });
    } catch (e) {
      complete = false;
      problems.push(`${abs}: ${e.message}`);
      continue;
    }
    // A member's `complexType` (docs and types) does not change any flag: only other unported things do.
    const bad = result.diagnostics.find((d) => !/^stencilrs: the type of /.test(d.message) && (d.message.startsWith('stencilrs:') || d.level === 'error'));
    if (bad) {
      complete = false;
      problems.push(`${abs}: ${bad.message}`);
      continue;
    }
    if (!result.components?.length) continue; // a base class or mixin
    const meta = compilerMetaOf(result.code);
    if (!meta) {
      complete = false;
      problems.push(`${abs}: no COMPILER_META`);
      continue;
    }
    cmps.push(meta);
  }
  return { cmps, complete, signalsImport, problems };
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
 * SSR output target; here when the `hydrateClient` option is on.
 */
export function standaloneFlags(cmps, { hydrateClientSide = false, signals = false } = {}) {
  const b = buildFeatures(cmps);
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
