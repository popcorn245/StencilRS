// Which optional features of runtime.js (`F_*` there) a build needs, so that the Vite plugin's `runtimeFeatures` option can compile the
// others out of the bundle (docs/runtime.md). `runtime: 'stencilrs'` production browser builds only.
//
// 'auto' is decided from what the build compiled: the plugin hands every module it transforms to a `FeatureScan` (components with
// their metadata, the code compiled from them, and the other modules that import the runtime), and `renderChunk` asks for the
// features of the modules that are in the bundle. A module the scan cannot read the use of a feature in counts as using it: a wrong
// `false` renders a page broken, a wrong `true` costs bytes.

export const RUNTIME_FEATURES = ['server', 'hydrate', 'resume', 'light', 'signals', 'vnode', 'hot'];

/**
 * What `runtimeFeatures` is when the option is not set, for `runtime: 'stencilrs'` production browser builds: `'auto'` (the features the
 * build uses), `'all'` (the whole runtime, as before `runtimeFeatures` existed) or an object. The one place to change the default.
 */
export const DEFAULT_RUNTIME_FEATURES = 'auto';

/**
 * The option as a mode: `{ mode: 'all' }` (`false`, `'all'`), `{ mode: 'auto' }`, `{ mode: 'client' }` (auto for a client-only app: no
 * hydration, no resuming), or `{ mode: 'explicit', features }` (an object:
 * `{ hydrate: false }`; a feature left out is on). Unset is `DEFAULT_RUNTIME_FEATURES`.
 */
export function resolveRuntimeFeatures(option = DEFAULT_RUNTIME_FEATURES) {
  if (option === false || option === 'all') return { mode: 'all' };
  if (option === 'auto') return { mode: 'auto' };
  if (option === 'client') return { mode: 'client' };
  if (option && typeof option === 'object' && !Array.isArray(option)) {
    const unknown = Object.keys(option).filter((k) => !RUNTIME_FEATURES.includes(k));
    if (unknown.length) throw new Error(`[stencilrs] runtimeFeatures: unknown feature ${unknown.map((k) => JSON.stringify(k)).join(', ')} (${RUNTIME_FEATURES.join(', ')})`);
    return { mode: 'explicit', features: option };
  }
  throw new Error(`[stencilrs] runtimeFeatures must be 'auto', 'client', 'all', false or an object, got ${JSON.stringify(option)}`);
}

/** Every feature, on unless `features` turns it off: `{ server: true, ..., hot: true }`. */
export const allFeatures = (features = {}) => Object.fromEntries(RUNTIME_FEATURES.map((k) => [k, features[k] ?? true]));

/**
 * The `define` entries for `features`: `__RS_FEAT_<NAME>__` as `'true'` or `'false'` (the whole runtime when no feature is given).
 * `applyRuntimeFeatures` does the same to bundled code.
 */
export function runtimeFeatureDefines(features) {
  const given = features && typeof features === 'object' ? features : {};
  if (features && typeof features !== 'object') throw new Error(`[stencilrs] runtimeFeatures must be an object, got ${JSON.stringify(features)}`);
  const unknown = Object.keys(given).filter((k) => !RUNTIME_FEATURES.includes(k));
  if (unknown.length) throw new Error(`[stencilrs] runtimeFeatures: unknown feature ${unknown.map((k) => JSON.stringify(k)).join(', ')} (${RUNTIME_FEATURES.join(', ')})`);
  return Object.fromEntries(RUNTIME_FEATURES.map((k) => [`__RS_FEAT_${k.toUpperCase()}__`, String(given[k] ?? true)]));
}

const FEAT_RE = /__RS_FEAT_([A-Z]+)__/g;

/**
 * The runtime's `__RS_FEAT_<NAME>__` constants in `code` written as `true` / `false`, each padded with spaces to the length of the name, so
 * that no position moves (the chunk's source map stays valid). The bundler's minifier then folds the `typeof` checks around them.
 * Returns the code unchanged (the same string) when it has none.
 */
export function applyRuntimeFeatures(code, features) {
  if (!code.includes('__RS_FEAT_')) return code;
  return code.replace(FEAT_RE, (whole, name) => {
    const key = name.toLowerCase();
    if (!RUNTIME_FEATURES.includes(key)) return whole;
    const lit = String(features[key] ?? true);
    return lit + ' '.repeat(whole.length - lit.length);
  });
}

/** The text of a call's argument list, from the `(` after `at`: up to its matching `)` (strings are not told apart: a stray `)` in one only makes the text shorter). */
const callArgs = (code, at) => {
  const open = code.indexOf('(', at);
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
};

const SIGNALS_RE = /\b(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](?:@stencil\/core\/signals|@popcorn245\/stencilrs\/signals)['"]/;
/** What a module that is not a component takes from the runtime (`@stencil/core` is the runtime's alias here, `@popcorn245/stencilrs/runtime` its own name). */
const RUNTIME_IMPORT_RE = /import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"](?:@stencil\/core|@popcorn245\/stencilrs\/runtime)['"]/g;
const VNODE_NAMES = new Set(['h', 'Fragment', 'FunctionalComponent', 'VNode', 'fc']);
const CLASS_NAMES = new Set(['Base', 'define', 'Mixin']);
// A template's part list: `[node, 6]` is a spread, `[node, 7, name]` a `<slot>` outside shadow DOM (runtime.js `makePart`).
const SPREAD_PART_RE = /\[\s*\d+\s*,\s*6\s*[,\]]/;
const SLOT_PART_RE = /\[\s*\d+\s*,\s*7\s*[,\]]/;

const importedNames = (code) => {
  const names = new Set();
  for (const m of code.matchAll(RUNTIME_IMPORT_RE)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '');
      if (name) names.add(name);
    }
  }
  return names;
};

/**
 * The features a compiled component module uses (what `transpile` returned: `components` with their metadata, `code` the output; `source`
 * the text it was compiled from):
 * - `light`: a component whose `encapsulation` is not `shadow` (metadata), or a `<slot>` part in a template
 * - `vnode`: `h`, `Fragment` and the like imported, a functional component called (`fc`), a spread part
 * - `signals`: a signals import
 * and `components`, each component's tag and encapsulation, for messages.
 */
export function compiledUses({ components = [], code = '', source = '' }) {
  // The output's imports are the ones in use (an `h` imported for JSX and never called is dropped); the source is read for signals only.
  const names = importedNames(code);
  const aliased = /\bfc\s+as\s+__rs_fc\b|\b__rs_fc\s*\(/.test(code);
  let spread = false;
  let slot = false;
  for (let at = code.indexOf('template('); at >= 0; at = code.indexOf('template(', at + 1)) {
    const args = callArgs(code, at);
    spread ||= SPREAD_PART_RE.test(args);
    slot ||= SLOT_PART_RE.test(args);
  }
  return {
    light: components.some((c) => c.encapsulation !== 'shadow') || slot,
    vnode: aliased || spread || [...names].some((n) => VNODE_NAMES.has(n)),
    signals: SIGNALS_RE.test(code) || SIGNALS_RE.test(source),
    components: components.map((c) => ({ tag: c.tagName, encapsulation: c.encapsulation })),
  };
}

/**
 * The features a module that stencilrs did not compile uses, from its text: a signals import; `h` and the like imported from the runtime
 * (`vnode`); `Base`, `define` or `Mixin` (a hand-written component: `light` and `vnode`, as nothing says what it renders).
 */
export function otherUses(code) {
  const none = { light: false, vnode: false, signals: false };
  if (!code.includes('@stencil/core') && !code.includes('@popcorn245/stencilrs')) return none;
  const names = importedNames(code);
  const hand = [...names].some((n) => CLASS_NAMES.has(n));
  return { light: hand, vnode: hand || [...names].some((n) => VNODE_NAMES.has(n)), signals: SIGNALS_RE.test(code) };
}

/**
 * What the Vite plugin collected during a build, per module file. Entries are kept across watch rebuilds (a module that is not
 * transformed again keeps its entry) and `features` asks only for the modules in the current bundle, so a deleted component stops counting.
 */
export class FeatureScan {
  #files = new Map();

  /** Forget everything (a build that starts again from nothing). */
  clear() {
    this.#files.clear();
  }

  /** A module compiled to a component module (or a base class: `components` empty): see `compiledUses`. */
  compiled(file, result) {
    this.#files.set(file, compiledUses(result));
  }

  /** A module that was not compiled: see `otherUses`. */
  other(file, code) {
    const uses = otherUses(code);
    if (uses.light || uses.vnode || uses.signals) this.#files.set(file, uses);
    else this.#files.delete(file);
  }

  /** `{ light, vnode, signals }` for the files in `moduleIds` (the bundle's modules; `undefined`: every file seen), the components found, and which files use each feature. */
  features(moduleIds) {
    const inBundle = moduleIds ? new Set([...moduleIds].map((id) => id.split('?')[0].replaceAll('\\', '/'))) : null;
    const used = { light: false, vnode: false, signals: false };
    const components = [];
    const files = { light: [], vnode: [], signals: [] };
    for (const [file, u] of this.#files) {
      if (inBundle && !inBundle.has(file)) continue;
      for (const k of ['light', 'vnode', 'signals']) {
        if (u[k]) {
          used[k] = true;
          files[k].push(file);
        }
      }
      for (const c of u.components ?? []) components.push({ file, ...c });
    }
    return { ...used, files, components };
  }
}

/**
 * `runtimeFeatures: 'auto'`: server and hot reload off (a production browser build), `light`, `vnode` and `signals` as the build uses
 * them, `hydrate` and `resume` on (a page the server rendered cannot be told from the client build, and dropping them would render it
 * again without a word), `signals` also on with the plugin's `signals` option. `client` (`'client'`): the same with `hydrate` and
 * `resume` off, for an app no server renders.
 */
export function autoRuntimeFeatures(used, { client = false, signals = false } = {}) {
  return { server: false, hot: false, hydrate: !client, resume: !client, light: !!used.light, signals: !!used.signals || !!signals, vnode: !!used.vnode };
}

/**
 * An explicit `{ light: false }` with a component that is not shadow DOM would render without its slots and styles: the message to fail
 * the build with, or null when the component is fine.
 */
export function lightOffError(file, components, features) {
  if (!features || features.light !== false) return null;
  const bad = components.filter((c) => c.encapsulation !== 'shadow');
  if (!bad.length) return null;
  const list = bad.map((c) => `<${c.tagName ?? c.tag}> (${c.encapsulation || 'none'})`).join(', ');
  return `runtimeFeatures.light is false, but ${file} has ${list}: a component without shadow DOM needs the light-DOM half of the runtime (slots, scoped and global styles). Use \`encapsulation: { type: 'shadow' }\` for it, or leave \`light\` on ('auto' turns it on when a component needs it).`;
}
